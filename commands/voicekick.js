const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "voicekick",
  description: "Kick member from voice channel | طرد عضو من الروم الصوتي",
  permission: PermissionFlagsBits.MoveMembers,
  options: [
    { name: "user", type: 6, required: true, description: "The member | العضو" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      if (!member || !member.voice?.channel) return ctx.reply("**❌ | Member is not in a voice channel.**");
      await member.voice.disconnect();
      return ctx.reply("**✅ | Successfully disconnected " + (member.user?.username || member.displayName) + "**");
    } catch (err) {
      return ctx.reply("**❌ | Error disconnecting member.**");
    }
  }
};