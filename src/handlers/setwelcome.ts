import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getWelcome, setWelcome } from "../data.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("setwelcome:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const current = await getWelcome();
  await ctx.editMessageText(
    `Current welcome message:\n\n${current.textContent}\n\nButton: ${current.buttonLabel}\nTimeout notice: ${current.timeoutNotice}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("✏️ Change message", "setwelcome:text")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.command("setwelcome", async (ctx) => {
  const current = await getWelcome();
  await ctx.reply(
    `Current welcome message:\n\n${current.textContent}\n\nButton: ${current.buttonLabel}\nTimeout notice: ${current.timeoutNotice}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("✏️ Change message", "setwelcome:text")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("setwelcome:text", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_welcome_text";
  await ctx.editMessageText("Send the new welcome message text:");
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_welcome_text") return next();

  const text = ctx.message.text;
  const current = await getWelcome();
  current.textContent = text;
  await setWelcome(current);
  ctx.session.step = "idle";

  await ctx.reply(
    `✅ Welcome message updated!\n\nNew message:\n${text}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
