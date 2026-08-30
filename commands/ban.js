const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a user or member from the server | حظر عضو أو أيدي من السيرفر",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      type: 6, // USER Type (Mentions & Pickers)
      required: true,
      description: "Select user or enter User ID | اختر العضو أو ضع الأيدي"
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
    try {
      // الحصول على خيار المستخدم الممرر أو الأيدي
      let userObj = null;
      let userId = null;

      if (ctx.interaction) {
        userObj = ctx.interaction.options.getUser("user");
        userId = userObj ? userObj.id : ctx.interaction.options.getString("user");
      } else if (ctx.options) {
        if (typeof ctx.options.getUser === "function") {
          userObj = ctx.options.getUser("user");
        }
        if (userObj) {
          userId = userObj.id;
        } else {
          const raw = ctx.getString ? ctx.getString("user") : null;
          if (raw) userId = raw.replace(/[<@!>]/g, "").trim();
        }
      }

      if (!userId) {
        return ctx.reply("**❌ | User not specified or invalid.**");
      }

      // جلب بيانات العضو من السيرفر إن وجد للتحقق من الرتب
      const member = await ctx.guild.members.fetch(userId).catch(() => null);
      if (member && !member.bannable) {
        return ctx.reply("**❌ | Cannot ban this member (Higher role or missing permissions).**");
      }

      // جلب بيانات الحساب مباشرة من ديسكورد للحظر خارج السيرفر
      if (!userObj) {
        userObj = await ctx.client.users.fetch(userId).catch(() => null);
      }

      const reason = ctx.getString ? ctx.getString("reason") || "No reason provided" : "No reason provided";
      const time = ctx.getString ? ctx.getString("time") : null;
      const bulk = ctx.options?.getBoolean ? ctx.options.getBoolean("bulk") : false;

      let deleteMessageSeconds = bulk ? 7 * 24 * 60 * 60 : 0;
      let banReason = time ? `${reason} (Duration: ${time})` : reason;

      // حظر المستخدم عبر الأيدي مباشرة
      await ctx.guild.members.ban(userId, {
        reason: banReason,
        deleteMessageSeconds: deleteMessageSeconds
      });

      const nameDisplay = userObj ? `${userObj.tag || userObj.username} (${userId})` : userId;
      return ctx.reply(`**✅ | Successfully banned ${nameDisplay}** ${time ? `for ${time}` : ""}`);

    } catch (err) {
      console.error("Ban Command Error:", err);
      return ctx.reply("**❌ | Could not ban this user. Check if the ID is valid and bot permissions.**");
    }
  }
};
