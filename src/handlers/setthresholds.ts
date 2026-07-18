import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getAllThresholds, setThreshold } from "../data.js";

const composer = new Composer<Ctx>();

const THRESHOLD_TYPES = [
  { type: "identicalMessage", label: "Identical message repeats", description: "Number of identical messages before action" },
  { type: "floodRate", label: "Flood rate", description: "Messages in window before flood action" },
  { type: "floodWindow", label: "Flood window (seconds)", description: "Time window for flood detection" },
  { type: "accountAge", label: "Min account age (hours)", description: "Minimum account age for new-link spam check" },
];

composer.callbackQuery("setthresholds:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const thresholds = await getAllThresholds();
  const lines = THRESHOLD_TYPES.map((t) => `${t.label}: ${thresholds[t.type] ?? "default"}`);
  await ctx.editMessageText(
    `Current spam thresholds:\n\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([
        ...THRESHOLD_TYPES.map((t) => [
          inlineButton(`✏️ ${t.label}`, `setthresholds:set:${t.type}`),
        ]),
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.command("setthresholds", async (ctx) => {
  const thresholds = await getAllThresholds();
  const lines = THRESHOLD_TYPES.map((t) => `${t.label}: ${thresholds[t.type] ?? "default"}`);
  await ctx.reply(
    `Current spam thresholds:\n\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([
        ...THRESHOLD_TYPES.map((t) => [
          inlineButton(`✏️ ${t.label}`, `setthresholds:set:${t.type}`),
        ]),
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery(/^setthresholds:set:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match;
  if (!match) return;
  const thresholdType = match[1];
  ctx.session.thresholdType = thresholdType;
  ctx.session.step = "awaiting_threshold_value";
  await ctx.editMessageText(`Enter new value for ${thresholdType}:`);
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_threshold_value") return next();

  const value = parseInt(ctx.message.text, 10);
  if (isNaN(value) || value < 0) {
    await ctx.reply("Please enter a valid positive number.");
    return;
  }

  const thresholdType = ctx.session.thresholdType;
  if (!thresholdType) {
    ctx.session.step = "idle";
    await ctx.reply("Something went wrong. Try again from the menu.");
    return;
  }

  await setThreshold(thresholdType, value);
  ctx.session.step = "idle";
  ctx.session.thresholdType = undefined;

  await ctx.reply(
    `✅ Updated ${thresholdType} to ${value}.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
