const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "voiceunmute",
  description: "Unmute member in voice | فك الميوت الصوتي",
  permission: PermissionFlagsBits.MuteMembers,
  options: [
    {
        "name": "user",
        "type": 6,
        "required": true,
        "description": "The member"
    }
],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      if (!member || !member.voice?.channel) return ctx.reply("**❌ | Member is not in a voice channel.**");
      await member.voice.setMute(false);
      return ctx.reply("**✅ | Voice unmuted " + (member.user?.username || member.displayName) + "**");
    } catch (err) {
      return ctx.reply("**❌ | Error voice unmuting.**");
    }
  }
};
