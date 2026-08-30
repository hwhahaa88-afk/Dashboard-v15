const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "unmute",
  description: "Unmute a member | فك الميوت الكتابي عن عضو",
  permission: PermissionFlagsBits.ModerateMembers,
  options: [
    { name: "user", type: 6, required: true, description: "The member to unmute | العضو المراد فك كتمه" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      if (!member) return ctx.reply("**❌ | Member not found.**");
      await member.timeout(null);
      return ctx.reply("**✅ | Successfully unmuted " + (member.user?.username || member.displayName) + "**");
    } catch (err) {
      return ctx.reply("**❌ | Could not unmute member.**");
    }
  }
};