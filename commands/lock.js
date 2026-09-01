const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'lock',
  description: 'Disables @everyone from sending messages in the channel',
  permission: PermissionFlagsBits.ManageChannels,
  options: [
    {
      name: 'channel',
      type: 7, // CHANNEL
      required: false,
      description: 'The channel to lock',
    },
    {
      name: 'reason',
      type: 3, // STRING
      required: false,
      description: 'Reason for locking',
    },
  ],
  async execute(ctx) {
    try {
      const channel = ctx.raw.options.getChannel('channel') || ctx.channel;
      const reason = ctx.getString('reason');

      await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, {
        SendMessages: false,
      });

      let content = `🔒 ${channel} **has been locked.**`;
      if (reason) {
        content += `\nReason: **${reason}**`;
      }

      await ctx.reply({ content });
    } catch (err) {
      console.error('Lock command error:', err);
      await ctx.reply({ content: '❌ Failed to lock the channel.' }).catch(() => null);
    }
  },
};
