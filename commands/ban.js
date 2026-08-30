const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a member from the server | حظر عضو",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
        "name": "user",
        "type": 6,
        "required": true,
        "description": "The member to ban"
    },
    {
        "name": "reason",
        "type": 3,
        "required": false,
        "description": "Reason for ban"
    }
],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      const reason = ctx.getString("reason") || "No reason provided";
      if (!member) return ctx.reply("**❌ | Member not found.**");
      if (!member.bannable) return ctx.reply("**❌ | Cannot ban this member.**");
      await member.ban({ reason });
      return ctx.reply("**✅ | Successfully banned " + (member.user?.username || member.displayName) + "**");
    } catch (err) {
      return ctx.reply("**❌ | Failed to ban member.**");
    }
  }
};
