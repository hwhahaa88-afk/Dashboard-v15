const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "voicedeaf",
  description: "Deafen member in voice channel | صم أذني عضو في الصوتي",
  permission: PermissionFlagsBits.DeafenMembers,
  options: [
    { name: "user", type: 6, required: true, description: "The member | العضو" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      if (!member || !member.voice?.channel) return ctx.reply("**❌ | Member is not in a voice channel.**");
      await member.voice.setDeaf(true);
      return ctx.reply("**✅ | Voice deafened " + (member.user?.username || member.displayName) + "**");
    } catch (err) {
      return ctx.reply("**❌ | Error deafening member.**");
    }
  }
};