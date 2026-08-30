const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "unban",
  description: "Unban user by ID | فك الحظر بالأيدي",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
        "name": "userid",
        "type": 3,
        "required": true,
        "description": "User ID"
    }
],
  execute: async (ctx) => {
    try {
      const userId = ctx.getString("userid");
      await ctx.guild.bans.remove(userId);
      return ctx.reply("**✅ | Unbanned ID: " + userId + "**");
    } catch (err) {
      return ctx.reply("**❌ | Could not unban user.**");
    }
  }
};
