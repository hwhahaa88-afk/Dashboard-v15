const { PermissionFlagsBits } = require("discord.js");

function r(emoji, text) {
  return `${emoji} | ${text}`;
}

const commands = [
  {
    name: "vmove",
    description: "Move a member to another voice channel | نقل عضو لروم صوتي آخر",
    permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: "user", type: "user", required: true, description: "The member to move" },
      { name: "channel", type: "channel", required: false, description: "Target voice channel (optional)" }
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember("user");
      if (!member) return ctx.reply(r("❌", "Member not found."));
      if (!member.voice || !member.voice.channel) return ctx.reply(r("❌", "Member is not in a voice channel."));

      let targetChannel = ctx.getChannel("channel");
      if (!targetChannel) {
        const invokerMember = await ctx.guild.members.fetch(ctx.invoker.id).catch(() => null);
        targetChannel = invokerMember?.voice?.channel;
      }

      if (!targetChannel || !targetChannel.isVoiceBased()) {
        return ctx.reply(r("❌", "Please specify a valid voice channel option or join a voice channel first."));
      }

      await member.voice.setChannel(targetChannel);
      return ctx.reply(r("✅", "**" + (member.user.username || member.displayName) + "** has been moved to <#" + targetChannel.id + ">!"));
    }
  }
];

module.exports = commands;
