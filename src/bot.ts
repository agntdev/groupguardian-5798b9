import { Composer } from "grammy";
import { readdirSync } from "node:fs";
import { createBot, type BotContext } from "./toolkit/index.js";

// The per-chat session shape (ephemeral conversation state only). Extend as the
// bot grows. Durable domain data must NOT live here — use the toolkit's
// persistent storage (see AGENTS.md).
export interface Session {
  step?:
    | "idle"
    | "awaiting_welcome_text"
    | "awaiting_welcome_button"
    | "awaiting_welcome_timeout"
    | "awaiting_threshold_type"
    | "awaiting_threshold_value"
    | "awaiting_rule_type"
    | "awaiting_rule_action"
    | "awaiting_rule_value"
    | "awaiting_mute_duration"
    | "awaiting_warn_reason"
    | "awaiting_ban_reason"
    | "awaiting_kick_reason"
    | "awaiting_mute_reason";
  pendingWelcome?: { text: string; buttonLabel: string };
  pendingThreshold?: { type: string };
  pendingRule?: { type: string; action: string };
  pendingAdminAction?: { type: string; userId: number; chatId: number };
  thresholdType?: string;
  isAdmin?: boolean;
}

export type Ctx = BotContext<Session>;

/**
 * buildBot — assembles the bot, AUTO-LOADS every feature handler from
 * src/handlers/, then registers the global fallback. Does NOT start the bot.
 * Add a feature by creating src/handlers/<name>.ts that default-exports a grammY
 * Composer — NEVER edit this file (concurrent feature PRs would conflict).
 */
export async function buildBot(token: string) {
  const bot = createBot<Session>(token, {
    initial: () => ({}),
  });

  const dir = new URL("./handlers/", import.meta.url);
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter(
      (f) =>
        (f.endsWith(".js") || f.endsWith(".ts")) &&
        !f.endsWith(".d.ts") &&
        !f.includes(".test.") &&
        !f.includes(".spec."),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    files = []; // no handlers/ dir yet → nothing to load
  }
  for (const file of files.sort()) {
    const mod = (await import(new URL(file, dir).href)) as { default?: Composer<Ctx> };
    if (!mod.default) {
      throw new Error(`handler ${file} must default-export a grammY Composer`);
    }
    bot.use(mod.default);
  }

  bot.on("message", (ctx) => ctx.reply("Sorry, I didn't understand that. Try /help."));

  return bot;
}
