import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getLog, getLogCount } from "../data.js";

const composer = new Composer<Ctx>();

function formatEntry(e: { actionType: string; targetUser: number; reason: string; timestamp: number; isAutomated: boolean }): string {
  const date = new Date(e.timestamp).toISOString().slice(0, 16).replace("T", " ");
  const auto = e.isAutomated ? " [auto]" : "";
  return `${date} — ${e.actionType}${auto} → user ${e.targetUser}: ${e.reason}`;
}

composer.callbackQuery("viewlog:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const entries = await getLog(10);
  const total = await getLogCount();

  if (entries.length === 0) {
    await ctx.editMessageText("No moderation actions logged yet.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = entries.map(formatEntry);
  await ctx.editMessageText(
    `Recent actions (${total} total, showing last ${entries.length}):\n\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    },
  );
});

composer.command("viewlog", async (ctx) => {
  const entries = await getLog(10);
  const total = await getLogCount();

  if (entries.length === 0) {
    await ctx.reply("No moderation actions logged yet.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = entries.map(formatEntry);
  await ctx.reply(
    `Recent actions (${total} total, showing last ${entries.length}):\n\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    },
  );
});

export default composer;
