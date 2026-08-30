const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "mute",
  description: "Mute a member in text channels | ميوت كتابي لعضو",
  permission: PermissionFlagsBits.ModerateMembers,
  options: [
    { name: "user", type: 6, required: true, description: "The member to mute | العضو المراد كتمه" },
    { name: "duration", type: 4, required: false, description: "Duration in minutes | المدة بالدقائق" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      const duration = (ctx.getInteger("duration") || 60) * 60 * 1000;
      if (!member) return ctx.reply("**❌ | Member not found.**");
      await member.timeout(duration, "Muted by staff");
      return ctx.reply("**✅ | Successfully muted " + (member.user?.username || member.displayName) + "**");
    } catch (err) {
      return ctx.reply("**❌ | Could not mute member.**");
    }
  }
};