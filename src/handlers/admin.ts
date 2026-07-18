import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import {
  getMember,
  setMember,
  addLogEntry,
  isTrusted,
  now,
} from "../data.js";

const composer = new Composer<Ctx>();

function isAdmin(ctx: Ctx): boolean {
  const msg = ctx.message;
  if (!msg) return false;
  const chat = msg.chat;
  if (chat.type === "private") return ctx.session.isAdmin === true;
  return false;
}

// /warn <user_id> [reason]
composer.command("warn", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("Only admins can use this command.");
    return;
  }
  const args = ctx.message?.text?.split(" ").slice(1) ?? [];
  const targetId = parseInt(args[0] ?? "", 10);
  if (isNaN(targetId)) {
    await ctx.reply("Usage: /warn <user_id> [reason]");
    return;
  }
  const reason = args.slice(1).join(" ") || "No reason specified";
  const chatId = ctx.chat?.id ?? 0;

  const member = await getMember(chatId, targetId);
  if (!member) {
    await ctx.reply("User not found in this group.");
    return;
  }

  member.warnings += 1;
  await setMember(chatId, member);

  await addLogEntry({
    actionType: "warn",
    targetUser: targetId,
    reason,
    timestamp: now(),
    initiator: ctx.from?.id ?? 0,
    isAutomated: false,
  });

  await ctx.reply(`⚠️ Warned ${member.displayName} (warning ${member.warnings}). Reason: ${reason}`);
});

// /mute <user_id> <duration_minutes> [reason]
composer.command("mute", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("Only admins can use this command.");
    return;
  }
  const args = ctx.message?.text?.split(" ").slice(1) ?? [];
  const targetId = parseInt(args[0] ?? "", 10);
  const duration = parseInt(args[1] ?? "", 10);
  if (isNaN(targetId) || isNaN(duration)) {
    await ctx.reply("Usage: /mute <user_id> <minutes> [reason]");
    return;
  }
  const reason = args.slice(2).join(" ") || "No reason specified";
  const chatId = ctx.chat?.id ?? 0;

  const member = await getMember(chatId, targetId);
  if (!member) {
    await ctx.reply("User not found in this group.");
    return;
  }

  await addLogEntry({
    actionType: "mute",
    targetUser: targetId,
    reason: `${reason} (${duration} min)`,
    timestamp: now(),
    initiator: ctx.from?.id ?? 0,
    isAutomated: false,
  });

  await ctx.reply(`🔇 Muted ${member.displayName} for ${duration} minutes. Reason: ${reason}`);
});

// /kick <user_id> [reason]
composer.command("kick", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("Only admins can use this command.");
    return;
  }
  const args = ctx.message?.text?.split(" ").slice(1) ?? [];
  const targetId = parseInt(args[0] ?? "", 10);
  if (isNaN(targetId)) {
    await ctx.reply("Usage: /kick <user_id> [reason]");
    return;
  }
  const reason = args.slice(1).join(" ") || "No reason specified";
  const chatId = ctx.chat?.id ?? 0;

  const member = await getMember(chatId, targetId);
  if (!member) {
    await ctx.reply("User not found in this group.");
    return;
  }

  await addLogEntry({
    actionType: "kick",
    targetUser: targetId,
    reason,
    timestamp: now(),
    initiator: ctx.from?.id ?? 0,
    isAutomated: false,
  });

  await ctx.reply(`👢 Kicked ${member.displayName}. Reason: ${reason}`);
});

// /ban <user_id> [reason]
composer.command("ban", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("Only admins can use this command.");
    return;
  }
  const args = ctx.message?.text?.split(" ").slice(1) ?? [];
  const targetId = parseInt(args[0] ?? "", 10);
  if (isNaN(targetId)) {
    await ctx.reply("Usage: /ban <user_id> [reason]");
    return;
  }
  const reason = args.slice(1).join(" ") || "No reason specified";
  const chatId = ctx.chat?.id ?? 0;

  const member = await getMember(chatId, targetId);
  if (!member) {
    await ctx.reply("User not found in this group.");
    return;
  }

  await addLogEntry({
    actionType: "ban",
    targetUser: targetId,
    reason,
    timestamp: now(),
    initiator: ctx.from?.id ?? 0,
    isAutomated: false,
  });

  await ctx.reply(`🚫 Banned ${member.displayName}. Reason: ${reason}`);
});

// /trust <user_id>
composer.command("trust", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("Only admins can use this command.");
    return;
  }
  const args = ctx.message?.text?.split(" ").slice(1) ?? [];
  const targetId = parseInt(args[0] ?? "", 10);
  if (isNaN(targetId)) {
    await ctx.reply("Usage: /trust <user_id>");
    return;
  }
  const chatId = ctx.chat?.id ?? 0;

  const member = await getMember(chatId, targetId);
  if (!member) {
    await ctx.reply("User not found in this group.");
    return;
  }

  member.trustStatus = "trusted";
  await setMember(chatId, member);

  await addLogEntry({
    actionType: "trust",
    targetUser: targetId,
    reason: "Marked as trusted",
    timestamp: now(),
    initiator: ctx.from?.id ?? 0,
    isAutomated: false,
  });

  await ctx.reply(`🛡️ ${member.displayName} is now trusted.`);
});

// /untrust <user_id>
composer.command("untrust", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("Only admins can use this command.");
    return;
  }
  const args = ctx.message?.text?.split(" ").slice(1) ?? [];
  const targetId = parseInt(args[0] ?? "", 10);
  if (isNaN(targetId)) {
    await ctx.reply("Usage: /untrust <user_id>");
    return;
  }
  const chatId = ctx.chat?.id ?? 0;

  const member = await getMember(chatId, targetId);
  if (!member) {
    await ctx.reply("User not found in this group.");
    return;
  }

  member.trustStatus = "untrusted";
  await setMember(chatId, member);

  await addLogEntry({
    actionType: "untrust",
    targetUser: targetId,
    reason: "Trust revoked",
    timestamp: now(),
    initiator: ctx.from?.id ?? 0,
    isAutomated: false,
  });

  await ctx.reply(`🔓 ${member.displayName} is no longer trusted.`);
});

export default composer;
