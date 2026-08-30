const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a user or member from the server | حظر عضو أو أيدي من السيرفر",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      type: 3, // String type to accept both Mention and direct ID
      required: true,
      description: "User ID or Mention to ban | أيدي أو منشن العضو المراد حظره"
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
    // الرد المبدئي السريع لتجنب خطأ عدم استجابة التطبيق
    if (ctx.interaction && !ctx.interaction.deferred && !ctx.interaction.replied) {
      await ctx.interaction.deferReply().catch(() => {});
    }

    try {
      let rawInput = "";
      
      if (ctx.interaction) {
        rawInput = ctx.interaction.options.getString("user") || "";
      } else if (typeof ctx.getString === "function") {
        rawInput = ctx.getString("user") || "";
      } else if (ctx.options && typeof ctx.options.get === "function") {
        const opt = ctx.options.get("user");
        if (opt) rawInput = String(opt.value);
      }

      // استخراج الـ ID فقط بعد تنظيف المنشن والأقواس
      const userId = rawInput.replace(/[<@!>]/g, "").trim();

      if (!userId || isNaN(userId)) {
        return sendResponse(ctx, "**❌ | Invalid User ID or Mention.**");
      }

      // التحقق من وجود العضو داخل السيرفر لمعرفة صلاحيات حظره
      const member = await ctx.guild.members.fetch(userId).catch(() => null);
      if (member && !member.bannable) {
        return sendResponse(ctx, "**❌ | Cannot ban this member (Higher role or missing permissions).**");
      }

      // جلب بيانات الحساب مباشرة من ديسكورد حتى لو كان خارج السيرفر
      const targetUser = await ctx.client.users.fetch(userId).catch(() => null);

      let reason = "No reason provided";
      let time = null;
      let bulk = false;

      if (ctx.interaction) {
        reason = ctx.interaction.options.getString("reason") || reason;
        time = ctx.interaction.options.getString("time") || null;
        bulk = ctx.interaction.options.getBoolean("bulk") || false;
      } else if (typeof ctx.getString === "function") {
        reason = ctx.getString("reason") || reason;
        time = ctx.getString("time") || null;
        if (ctx.options && typeof ctx.options.getBoolean === "function") {
          bulk = ctx.options.getBoolean("bulk") || false;
        }
      }

      let deleteMessageSeconds = bulk ? 7 * 24 * 60 * 60 : 0;
      let banReason = time ? `${reason} (Duration: ${time})` : reason;

      // حظر المستخدم عبر الأيدي
      await ctx.guild.members.ban(userId, {
        reason: banReason,
        deleteMessageSeconds: deleteMessageSeconds
      });

      const displayName = targetUser ? `${targetUser.username} (${userId})` : userId;
      return sendResponse(ctx, `**✅ | Successfully banned ${displayName}** ${time ? `for ${time}` : ""}`);

    } catch (err) {
      console.error("Ban Command Error:", err);
      return sendResponse(ctx, "**❌ | Failed to ban user. Make sure the ID is correct and I have permissions.**");
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
