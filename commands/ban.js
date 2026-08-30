const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a member from the server | حظر عضو من السيرفر",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    { name: "user", type: 6, required: true, description: "The member to ban | العضو المراد حظره" },
    { name: "reason", type: 3, required: false, description: "Reason for ban | سبب الحظر" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      const reason = ctx.getString("reason") || "No reason provided";
      if (!member) return ctx.reply("**❌ | Member not found.**");
      if (!member.bannable) return ctx.reply("**❌ | Cannot ban this member.**");
      await member.ban({ reason });
      return ctx.reply("**✅ | Successfully banned " + (member.user?.username || member.displayName) + " for: " + reason + "**");
    } catch (err) {
      return ctx.reply("**❌ | An error occurred while banning the member.**");
    }
  }
};