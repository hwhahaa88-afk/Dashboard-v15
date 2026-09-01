const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'unlock',
  description: 'Allows @everyone to send messages in the channel',
  permission: PermissionFlagsBits.ManageChannels,
  options: [
    {
      name: 'channel',
      type: 7, // CHANNEL
      required: false,
      description: 'The channel to unlock',
    },
  ],
  async execute(ctx) {
    try {
      const channel = ctx.raw.options.getChannel('channel') || ctx.channel;

      await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, {
        SendMessages: null,
      });

      const content = `🔓 ${channel} **has been unlocked.**`;

      await ctx.reply({ content, embeds: [] });
    } catch (err) {
      console.error('Unlock command error:', err);
      await ctx.reply({ content: '❌ Failed to unlock the channel.' }).catch(() => null);
    }
  },
};
