const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "voicemove",
  description: "Move member to voice channel | نقل عضو إلى روم صوتي",
  permission: PermissionFlagsBits.MoveMembers,
  options: [
    { name: "user", type: 6, required: true, description: "The member | العضو" },
    { name: "channel", type: 7, required: false, description: "Voice channel | الروم الصوتي" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      if (!member || !member.voice?.channel) return ctx.reply("**❌ | Member is not in a voice channel.**");
      let targetChannel = ctx.getChannel("channel");
      if (!targetChannel) {
        const invokerId = ctx.invoker?.id || ctx.user?.id || ctx.author?.id;
        const invokerMember = await ctx.guild.members.fetch(invokerId).catch(() => null);
        targetChannel = invokerMember?.voice?.channel;
      }
      if (!targetChannel || !targetChannel.isVoiceBased()) return ctx.reply("**❌ | Specify a valid voice channel.**");
      await member.voice.setChannel(targetChannel);
      return ctx.reply("**✅ | Moved " + (member.user?.username || member.displayName) + " to <#" + targetChannel.id + ">!**");
    } catch (err) {
      return ctx.reply("**❌ | Error moving member.**");
    }
  }
};