const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "vmove",
  description: "Move a member to another voice channel | نقل عضو لروم صوتي آخر",
  permission: PermissionFlagsBits.MoveMembers,
  options: [
    { name: "user", type: "user", required: true, description: "The member to move" },
    { name: "channel", type: "channel", required: false, description: "Target voice channel (optional)" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      if (!member) return ctx.reply("**❌ | Member not found.**");
      if (!member.voice || !member.voice.channel) return ctx.reply("**❌ | Member is not in a voice channel.**");

      let targetChannel = ctx.getChannel("channel");
      if (!targetChannel) {
        const invokerId = ctx.invoker?.id || ctx.user?.id || ctx.author?.id;
        const invokerMember = await ctx.guild.members.fetch(invokerId).catch(() => null);
        targetChannel = invokerMember?.voice?.channel;
      }

      if (!targetChannel || !targetChannel.isVoiceBased()) {
        return ctx.reply("**❌ | Please specify a valid voice channel option or join a voice channel first.**");
      }

      await member.voice.setChannel(targetChannel);
      return ctx.reply("**✅ | " + (member.user?.username || member.displayName) + " has been moved to <#" + targetChannel.id + ">!**");
    } catch (err) {
      console.error(err);
      return ctx.reply("**❌ | An error occurred while moving the member.**");
    }
  }
};
