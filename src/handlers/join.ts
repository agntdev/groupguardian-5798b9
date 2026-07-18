import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { registerMember, getWelcome, setMember, getMember, now } from "../data.js";

const composer = new Composer<Ctx>();

composer.on("chat_member", async (ctx) => {
  const update = ctx.update.chat_member;
  if (!update) return;

  const newMember = update.new_chat_member;
  const oldMember = update.old_chat_member;

  if (newMember.status !== "member" || oldMember.status !== "left") return;
  if (newMember.user.is_bot) return;

  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const userId = newMember.user.id;
  const displayName = newMember.user.first_name ?? "User";

  await registerMember(chatId, {
    userId,
    displayName,
    joinTime: now(),
    trustStatus: "untrusted",
    adminStatus: false,
    warnings: 0,
  });

  const template = await getWelcome();
  const keyboard = inlineKeyboard([
    [inlineButton(template.buttonLabel, "verify:confirm")],
  ]);

  await ctx.reply(
    `${template.textContent}\n\nTap the button below to verify.`,
    { reply_markup: keyboard },
  );
});

export default composer;
