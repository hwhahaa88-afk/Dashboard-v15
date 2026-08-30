const { PermissionFlagsBits } = require('discord.js');

function r(emoji, text) {
  return `${emoji} | ${text}`;
}

const commands = [
  {
    name: 'vmove',
    description: 'Move a member to another voice channel | نقل عضو لروم صوتي آخر',
    permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to move' },
      { name: 'channel', type: 'channel', required: false, description: 'Target voice channel (optional)' }
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!member.voice || !member.voice.channel) return ctx.reply(r('❌', 'Member is not in a voice channel.'));

      let channel = ctx.getChannel('channel');
      if (!channel) {
        const invokerMember = await ctx.guild.members.fetch(ctx.invoker.id).catch(() => null);
        channel = invokerMember?.voice?.channel;
      }

      if (!channel || !channel.isVoiceBased()) {
        return ctx.reply(r('❌', 'You must specify a valid voice channel or be in one yourself.'));
      }

      await member.voice.setChannel(channel);
      return ctx.reply(r('✅', '**' + (member.user.username || member.displayName) + '** has been moved to <#' + channel.id + '>!'));
    }
  }
];

module.exports = commands;
