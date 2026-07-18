import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStats } from "../data.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("stats:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id ?? 0;
  const stats = await getStats(chatId);

  await ctx.editMessageText(
    `📊 Moderation stats\n\nMembers: ${stats.totalMembers}\nTrusted: ${stats.trustedCount}\nWarnings issued: ${stats.totalWarnings}\nActions logged: ${stats.totalActions}`,
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    },
  );
});

export default composer;
