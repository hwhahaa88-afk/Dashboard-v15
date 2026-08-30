const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a member or user from the server | حظر عضو من السيرفر",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      type: 6, // USER type
      required: true,
      description: "User to ban | العضو المراد حظره"
    },
    {
      name: "time",
      type: 3, // STRING
      required: false,
      description: "Ban duration (e.g., 1d, 7d) | مدة الحظر"
    },
    {
      name: "reason",
      type: 3, // STRING
      required: false,
      description: "Reason for ban | سبب الحظر"
    },
    {
      name: "bulk",
      type: 5, // BOOLEAN
      required: false,
      description: "Delete recent messages? | مسح الرسائل الأخيرة"
    }
  ],
  execute: async (ctx) => {
    try {
      const user = ctx.options?.getUser("user") || ctx.interaction?.options?.getUser("user");
      const reason = ctx.getString("reason") || "No reason provided";
      const time = ctx.getString("time");
      const bulk = ctx.options?.getBoolean("bulk");

      if (!user) {
        return ctx.reply("**❌ | Member not found.**");
      }

      const member = await ctx.guild.members.fetch(user.id).catch(() => null);

      if (member && !member.bannable) {
        return ctx.reply("**❌ | Cannot ban this member (Missing permissions or higher role).**");
      }

      let deleteMessageSeconds = 0;
      if (bulk) {
        deleteMessageSeconds = 7 * 24 * 60 * 60; // 7 days of messages
      }

      let banReason = reason;
      if (time) {
        banReason += ` (Duration: ${time})`;
      }

      await ctx.guild.members.ban(user.id, {
        reason: banReason,
        deleteMessageSeconds: deleteMessageSeconds
      });

      return ctx.reply(`**✅ | Successfully banned ${user.tag || user.username}** ${time ? `for ${time}` : ""}`);
    } catch (err) {
      console.error(err);
      return ctx.reply("**❌ | An error occurred while banning the user.**");
    }
  }
};
