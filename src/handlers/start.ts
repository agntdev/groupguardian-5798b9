import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard } from "../toolkit/index.js";
import { registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "✅ Verify", data: "verify:confirm", order: 10 });
registerMainMenuItem({ label: "📋 View log", data: "viewlog:show", order: 20 });
registerMainMenuItem({ label: "📊 Stats", data: "stats:show", order: 30 });
registerMainMenuItem({ label: "⚙️ Set welcome", data: "setwelcome:show", order: 40 });
registerMainMenuItem({ label: "🔧 Set rules", data: "setrules:show", order: 50 });
registerMainMenuItem({ label: "🎚️ Thresholds", data: "setthresholds:show", order: 60 });

const composer = new Composer<Ctx>();

const WELCOME = "👋 Welcome! Tap a button below to get started.";

composer.command("start", async (ctx) => {
  ctx.session.step = "idle";
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
