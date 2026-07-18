import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "./toolkit/session/redis.js";

export interface Member {
  userId: number;
  displayName: string;
  joinTime: number;
  trustStatus: "untrusted" | "trusted" | "verified";
  adminStatus: boolean;
  warnings: number;
}

export interface SpamRule {
  ruleType: string;
  thresholdValue: number;
  actionMapping: "warn" | "mute" | "kick" | "ban";
}

export interface ActionLogEntry {
  actionType: string;
  targetUser: number;
  reason: string;
  timestamp: number;
  initiator: number;
  isAutomated: boolean;
}

export interface WelcomeTemplate {
  textContent: string;
  buttonLabel: string;
  timeoutNotice: string;
}

const DEFAULT_WELCOME: WelcomeTemplate = {
  textContent: "Welcome to the group! Please verify you're human.",
  buttonLabel: "I'm human",
  timeoutNotice: "You didn't verify in time. Goodbye.",
};

const DEFAULT_THRESHOLDS: Record<string, number> = {
  identicalMessage: 3,
  floodRate: 5,
  floodWindow: 10,
  accountAge: 48,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter: StorageAdapter<any> = resolveSessionStorage<any>(undefined);

async function get<T>(key: string): Promise<T | undefined> {
  const v = await adapter.read(key);
  return v === undefined ? undefined : (v as T);
}

async function set(key: string, value: unknown): Promise<void> {
  await adapter.write(key, value);
}

async function del(key: string): Promise<void> {
  await adapter.delete(key);
}

// ── Members ──────────────────────────────────────────────────────────
export async function getMember(chatId: number, userId: number): Promise<Member | undefined> {
  return get<Member>(`gg:member:${chatId}:${userId}`);
}

export async function setMember(chatId: number, member: Member): Promise<void> {
  await set(`gg:member:${chatId}:${member.userId}`, member);
}

export async function deleteMember(chatId: number, userId: number): Promise<void> {
  await del(`gg:member:${chatId}:${userId}`);
}

export async function getMembers(chatId: number): Promise<Member[]> {
  const idx = (await get<number[]>(`gg:members:${chatId}:idx`)) ?? [];
  const members: Member[] = [];
  for (const uid of idx) {
    const m = await getMember(chatId, uid);
    if (m) members.push(m);
  }
  return members;
}

async function addMemberIndex(chatId: number, userId: number): Promise<void> {
  const idx = (await get<number[]>(`gg:members:${chatId}:idx`)) ?? [];
  if (!idx.includes(userId)) {
    idx.push(userId);
    await set(`gg:members:${chatId}:idx`, idx);
  }
}

export async function registerMember(chatId: number, member: Member): Promise<void> {
  await setMember(chatId, member);
  await addMemberIndex(chatId, member.userId);
}

// ── Spam rules ───────────────────────────────────────────────────────
export async function getRule(ruleType: string): Promise<SpamRule | undefined> {
  return get<SpamRule>(`gg:rule:${ruleType}`);
}

export async function setRule(rule: SpamRule): Promise<void> {
  await set(`gg:rule:${rule.ruleType}`, rule);
  const idx = (await get<string[]>("gg:rules:idx")) ?? [];
  if (!idx.includes(rule.ruleType)) {
    idx.push(rule.ruleType);
    await set("gg:rules:idx", idx);
  }
}

export async function deleteRule(ruleType: string): Promise<void> {
  await del(`gg:rule:${ruleType}`);
  const idx = (await get<string[]>("gg:rules:idx")) ?? [];
  const next = idx.filter((t) => t !== ruleType);
  await set("gg:rules:idx", next);
}

export async function getAllRules(): Promise<SpamRule[]> {
  const idx = (await get<string[]>("gg:rules:idx")) ?? [];
  const rules: SpamRule[] = [];
  for (const t of idx) {
    const r = await getRule(t);
    if (r) rules.push(r);
  }
  return rules;
}

// ── Action log ───────────────────────────────────────────────────────
const MAX_LOG_ENTRIES = 1000;

export async function addLogEntry(entry: ActionLogEntry): Promise<void> {
  const entries = (await get<ActionLogEntry[]>("gg:log:entries")) ?? [];
  entries.push(entry);
  if (entries.length > MAX_LOG_ENTRIES) entries.splice(0, entries.length - MAX_LOG_ENTRIES);
  await set("gg:log:entries", entries);
}

export async function getLog(limit = 20): Promise<ActionLogEntry[]> {
  const all = (await get<ActionLogEntry[]>("gg:log:entries")) ?? [];
  return all.slice(-limit).reverse();
}

export async function getLogCount(): Promise<number> {
  const all = (await get<ActionLogEntry[]>("gg:log:entries")) ?? [];
  return all.length;
}

// ── Welcome template ─────────────────────────────────────────────────
export async function getWelcome(): Promise<WelcomeTemplate> {
  return (await get<WelcomeTemplate>("gg:welcome:current")) ?? { ...DEFAULT_WELCOME };
}

export async function setWelcome(template: WelcomeTemplate): Promise<void> {
  await set("gg:welcome:current", template);
}

// ── Thresholds ───────────────────────────────────────────────────────
export async function getThreshold(type: string): Promise<number | undefined> {
  return get<number>(`gg:threshold:${type}`);
}

export async function setThreshold(type: string, value: number): Promise<void> {
  await set(`gg:threshold:${type}`, value);
  const idx = (await get<string[]>("gg:thresholds:idx")) ?? [];
  if (!idx.includes(type)) {
    idx.push(type);
    await set("gg:thresholds:idx", idx);
  }
}

export async function getAllThresholds(): Promise<Record<string, number>> {
  const idx = (await get<string[]>("gg:thresholds:idx")) ?? [];
  const result: Record<string, number> = { ...DEFAULT_THRESHOLDS };
  for (const t of idx) {
    const v = await getThreshold(t);
    if (v !== undefined) result[t] = v;
  }
  return result;
}

// ── Trusted users ────────────────────────────────────────────────────
export async function isTrusted(userId: number): Promise<boolean> {
  return (await get<boolean>(`gg:trusted:${userId}`)) === true;
}

export async function setTrusted(userId: number, trusted: boolean): Promise<void> {
  await set(`gg:trusted:${userId}`, trusted);
}

// ── Stats ────────────────────────────────────────────────────────────
export async function getStats(chatId: number): Promise<{
  totalMembers: number;
  totalActions: number;
  totalWarnings: number;
  trustedCount: number;
}> {
  const members = await getMembers(chatId);
  const logCount = await getLogCount();
  let totalWarnings = 0;
  let trustedCount = 0;
  for (const m of members) {
    totalWarnings += m.warnings;
    if (m.trustStatus === "trusted") trustedCount++;
  }
  return { totalMembers: members.length, totalActions: logCount, totalWarnings, trustedCount };
}

// ── Injectable clock ─────────────────────────────────────────────────
let clockFn: () => number = () => Date.now();
export function setClock(fn: () => number): void { clockFn = fn; }
export function now(): number { return clockFn(); }
