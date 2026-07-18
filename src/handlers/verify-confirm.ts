import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getMember, setMember, now } from "../data.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("verify:confirm", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const existing = await getMember(ctx.chat?.id ?? 0, userId);
  if (existing && existing.trustStatus === "verified") {
    await ctx.editMessageText("You're already verified.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const member = existing ?? {
    userId,
    displayName: ctx.from?.first_name ?? "User",
    joinTime: now(),
    trustStatus: "verified" as const,
    adminStatus: false,
    warnings: 0,
  };
  member.trustStatus = "verified";
  await setMember(ctx.chat?.id ?? 0, member);

  await ctx.editMessageText("✅ You're verified! Welcome to the group.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
