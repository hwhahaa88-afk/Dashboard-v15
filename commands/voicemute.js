const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "voicemute",
  description: "Mute member in voice channel | ميوت صوتي لعضو",
  permission: PermissionFlagsBits.MuteMembers,
  options: [
    { name: "user", type: 6, required: true, description: "The member | العضو" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      if (!member || !member.voice?.channel) return ctx.reply("**❌ | Member is not in a voice channel.**");
      await member.voice.setMute(true);
      return ctx.reply("**✅ | Voice muted " + (member.user?.username || member.displayName) + "**");
    } catch (err) {
      return ctx.reply("**❌ | Error voice muting member.**");
    }
  }
};