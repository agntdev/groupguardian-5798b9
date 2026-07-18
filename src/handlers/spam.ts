import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  getMember,
  setMember,
  getAllRules,
  addLogEntry,
  now,
} from "../data.js";

const composer = new Composer<Ctx>();

const messageTimestamps = new Map<string, number[]>();
const IDENTICAL_MESSAGES = new Map<string, { text: string; count: number; firstSeen: number }>();

function rateKey(chatId: number, userId: number): string {
  return `${chatId}:${userId}`;
}

composer.on("message:text", async (ctx, next) => {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) {
    await next();
    return;
  }

  const member = await getMember(chatId, userId);
  if (!member || member.trustStatus === "trusted" || member.adminStatus) {
    await next();
    return;
  }

  const text = ctx.message.text;
  const nowMs = now();

  // Identical-message spam (3 repeats within 2 minutes)
  const idKey = rateKey(chatId, userId);
  const prev = IDENTICAL_MESSAGES.get(idKey);
  if (prev && prev.text === text && nowMs - prev.firstSeen < 120_000) {
    prev.count += 1;
    if (prev.count >= 3) {
      await enforceSpamRule(ctx, chatId, userId, "identicalMessage", "Repeated identical messages");
      IDENTICAL_MESSAGES.delete(idKey);
      await next();
      return;
    }
  } else {
    IDENTICAL_MESSAGES.set(idKey, { text, count: 1, firstSeen: nowMs });
  }

  // Flood rate (5 messages in 10 seconds)
  const key = rateKey(chatId, userId);
  const timestamps = messageTimestamps.get(key) ?? [];
  timestamps.push(nowMs);
  const windowStart = nowMs - 10_000;
  const recent = timestamps.filter((t) => t > windowStart);
  messageTimestamps.set(key, recent);

  if (recent.length >= 5) {
    await enforceSpamRule(ctx, chatId, userId, "floodRate", "Message flood detected");
    messageTimestamps.set(key, []);
    await next();
    return;
  }

  await next();
});

async function enforceSpamRule(
  ctx: Ctx,
  chatId: number,
  userId: number,
  ruleType: string,
  reason: string,
): Promise<void> {
  const rules = await getAllRules();
  const rule = rules.find((r) => r.ruleType === ruleType);
  const action = rule?.actionMapping ?? "warn";

  const member = await getMember(chatId, userId);
  const displayName = member?.displayName ?? "Unknown";

  await addLogEntry({
    actionType: `spam:${action}`,
    targetUser: userId,
    reason,
    timestamp: now(),
    initiator: 0,
    isAutomated: true,
  });

  switch (action) {
    case "warn":
      if (member) {
        member.warnings += 1;
        await setMember(chatId, member);
      }
      await ctx.reply(`⚠️ ${displayName}: ${reason}. This is a warning.`);
      break;
    case "mute":
      await ctx.reply(`🔇 ${displayName}: ${reason}. You've been muted.`);
      break;
    case "kick":
      await ctx.reply(`👢 ${displayName}: ${reason}. You've been kicked.`);
      break;
    case "ban":
      await ctx.reply(`🚫 ${displayName}: ${reason}. You've been banned.`);
      break;
  }
}

export default composer;
