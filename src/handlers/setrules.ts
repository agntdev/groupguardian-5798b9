import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getAllRules, setRule, deleteRule } from "../data.js";
import type { SpamRule } from "../data.js";

const composer = new Composer<Ctx>();

const RULE_TYPES = [
  { type: "identicalMessage", label: "Identical message" },
  { type: "floodRate", label: "Flood rate" },
  { type: "newLinkSpam", label: "New link spam" },
];

const ACTION_TYPES = ["warn", "mute", "kick", "ban"];

composer.callbackQuery("setrules:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const rules = await getAllRules();
  if (rules.length === 0) {
    await ctx.editMessageText(
      "No spam rules configured yet.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add rule", "setrules:add")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  const lines = rules.map((r) => `${r.ruleType}: ${r.actionMapping} at ${r.thresholdValue}`);
  await ctx.editMessageText(
    `Spam rules:\n\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add rule", "setrules:add")],
        ...rules.map((r) => [
          inlineButton(`🗑 Remove ${r.ruleType}`, `setrules:remove:${r.ruleType}`),
        ]),
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.command("setrules", async (ctx) => {
  const rules = await getAllRules();
  if (rules.length === 0) {
    await ctx.reply(
      "No spam rules configured yet.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add rule", "setrules:add")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  const lines = rules.map((r) => `${r.ruleType}: ${r.actionMapping} at ${r.thresholdValue}`);
  await ctx.reply(
    `Spam rules:\n\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add rule", "setrules:add")],
        ...rules.map((r) => [
          inlineButton(`🗑 Remove ${r.ruleType}`, `setrules:remove:${r.ruleType}`),
        ]),
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("setrules:add", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_rule_type";
  await ctx.editMessageText(
    "Select rule type:",
    {
      reply_markup: inlineKeyboard(
        RULE_TYPES.map((rt) => [inlineButton(rt.label, `setrules:type:${rt.type}`)]),
      ),
    },
  );
});

composer.callbackQuery(/^setrules:type:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match;
  if (!match) return;
  const ruleType = match[1];
  ctx.session.pendingRule = { type: ruleType, action: "" };
  ctx.session.step = "awaiting_rule_action";
  await ctx.editMessageText(
    "Select action:",
    {
      reply_markup: inlineKeyboard(
        ACTION_TYPES.map((a) => [inlineButton(a, `setrules:action:${a}`)]),
      ),
    },
  );
});

composer.callbackQuery(/^setrules:action:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match;
  if (!match) return;
  const action = match[1] as SpamRule["actionMapping"];
  if (!ACTION_TYPES.includes(action)) return;

  const pending = ctx.session.pendingRule;
  if (!pending) return;

  ctx.session.pendingRule = { ...pending, action };
  ctx.session.step = "awaiting_rule_value";
  await ctx.editMessageText("Enter threshold value (number):");
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step === "awaiting_rule_value") {
    const value = parseInt(ctx.message.text, 10);
    if (isNaN(value) || value < 1) {
      await ctx.reply("Please enter a valid positive number.");
      return;
    }

    const pending = ctx.session.pendingRule;
    if (!pending) {
      ctx.session.step = "idle";
      await ctx.reply("Something went wrong. Try again from the menu.");
      return;
    }

    await setRule({
      ruleType: pending.type,
      thresholdValue: value,
      actionMapping: pending.action as SpamRule["actionMapping"],
    });

    ctx.session.step = "idle";
    ctx.session.pendingRule = undefined;

    await ctx.reply(
      `✅ Rule added: ${pending.type} → ${pending.action} at ${value}`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  await next();
});

composer.callbackQuery(/^setrules:remove:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match;
  if (!match) return;
  const ruleType = match[1];
  await deleteRule(ruleType);
  await ctx.editMessageText(`✅ Removed rule: ${ruleType}`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
