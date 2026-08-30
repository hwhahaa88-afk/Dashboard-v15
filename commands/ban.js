const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a user or member from the server | حظر عضو أو أيدي من السيرفر",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      type: 3, // STRING لضمان قبول كتابة الأيدي مباشرة لمن هم خارج السيرفر
      required: true,
      description: "User ID or Mention | ضع أيدي الشخص أو المنشن"
    },
    {
      name: "time",
      type: 3,
      required: false,
      description: "Ban duration (e.g. 1d, 7d) | مدة الحظر"
    },
    {
      name: "reason",
      type: 3,
      required: false,
      description: "Reason for ban | سبب الحظر"
    },
    {
      name: "bulk",
      type: 5,
      required: false,
      description: "Delete recent messages | مسح الرسائل"
    }
  ],
  execute: async (ctx) => {
    if (ctx.interaction && !ctx.interaction.deferred && !ctx.interaction.replied) {
      await ctx.interaction.deferReply().catch(() => {});
    }

    try {
      let rawInput = "";
      
      if (ctx.interaction) {
        rawInput = ctx.interaction.options.getString("user") || "";
      } else if (typeof ctx.getString === "function") {
        rawInput = ctx.getString("user") || "";
      }

      // استخراج الـ ID المباشر من النص المدخل
      const userId = rawInput.replace(/[<@!>]/g, "").trim();

      if (!userId || isNaN(userId)) {
        return sendResponse(ctx, "**❌ | Invalid User ID or Mention.**");
      }

      const reason = (typeof ctx.getString === "function" ? ctx.getString("reason") : null) || "No reason provided";
      const time = typeof ctx.getString === "function" ? ctx.getString("time") : null;
      let bulk = ctx.interaction ? ctx.interaction.options.getBoolean("bulk") : false;

      let deleteMessageSeconds = bulk ? 7 * 24 * 60 * 60 : 0;
      let banReason = time ? `${reason} (Duration: ${time})` : reason;

      // تنفيذ الحظر المباشر من خوادم ديسكورد عبر الأيدي
      await ctx.guild.bans.create(userId, {
        reason: banReason,
        deleteMessageSeconds: deleteMessageSeconds
      });

      return sendResponse(ctx, `**✅ | Successfully banned <@${userId}> (${userId})** ${time ? `for ${time}` : ""}`);

    } catch (err) {
      console.error("BAN ERROR:", err);
      if (err.code === 50013) {
        return sendResponse(ctx, "**❌ | Missing Permissions: Place my role HIGHER than the user's role!**");
      } else if (err.code === 10013) {
        return sendResponse(ctx, "**❌ | Unknown User: Invalid Discord ID.**");
      }
      return sendResponse(ctx, `**❌ | Failed to ban: ${err.message || "Unknown error"}**`);
    }
  }
};

async function sendResponse(ctx, content) {
  if (ctx.interaction) {
    if (ctx.interaction.deferred || ctx.interaction.replied) {
      return ctx.interaction.editReply({ content }).catch(() => {});
    }
    return ctx.interaction.reply({ content }).catch(() => {});
  }
  return ctx.reply(content);
}
