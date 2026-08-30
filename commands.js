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
      { name: "channel", type: "channel", required: true, description: "Target voice channel" }
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember("user");
      if (!member) return ctx.reply(r("❌", "Member not found."));
      if (!member.voice || !member.voice.channel) return ctx.reply(r("❌", "Member is not in a voice channel."));

      const channel = ctx.getChannel("channel");
      if (!channel || !channel.isVoiceBased()) {
        return ctx.reply(r("❌", "Please select a valid voice channel."));
      }

      await member.voice.setChannel(channel);
      return ctx.reply(r("✅", "**" + (member.user.username || member.displayName) + "** has been moved to <#" + channel.id + ">!"));
    }
  }
];

module.exports = commands;
