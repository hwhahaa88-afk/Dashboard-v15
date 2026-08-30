const fs = require('fs');
let code = fs.readFileSync('commands.js', 'utf8');

const updatedVmove = `  {
    name: 'vmove', description: 'Move a member to another voice channel | نقل عضو لروم صوتي آخر', permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to move' },
      { name: 'channel', type: 'channel', required: false, description: 'Target voice channel (optional)' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!member.voice?.channel) return ctx.reply(r('❌', 'Member is not in a voice channel.'));

      let channel = ctx.getChannel('channel');
      if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
        const invokerMember = await ctx.guild.members.fetch(ctx.invoker.id).catch(() => null);
        channel = invokerMember?.voice?.channel;
      }
      if (!channel) return ctx.reply(r('❌', 'You must specify a voice channel or be in one yourself.'));

      await member.voice.setChannel(channel);
      return ctx.reply(r('✅', `**\${member.user.username}** has been moved to <#\${channel.id}>!`));
    },
  },`;

code = code.replace(/\{\s*name:\s*'vmove'[\s\S]*?\},(?=\s*\{)/, updatedVmove);
fs.writeFileSync('commands.js', code);
