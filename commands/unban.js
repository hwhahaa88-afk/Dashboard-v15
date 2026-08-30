const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "unban",
  description: "Unban a user by ID | فك الحظر بواسطة الـ ID",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    { name: "userid", type: 3, required: true, description: "The user ID | أيدي العضو" }
  ],
  execute: async (ctx) => {
    try {
      const userId = ctx.getString("userid");
      await ctx.guild.bans.remove(userId);
      return ctx.reply("**✅ | Successfully unbanned user ID: " + userId + "**");
    } catch (err) {
      return ctx.reply("**❌ | Could not unban user ID.**");
    }
  }
};