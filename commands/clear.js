const { PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');

module.exports = {
  name: 'clear',
  description: 'Bulk delete messages (1-100)',
  permission: PermissionFlagsBits.ManageMessages,
  options: [
    {
      name: 'amount',
      type: 4,
      required: true,
      description: 'Number of messages to delete',
    },
  ],
  async execute(ctx) {
    const amount = ctx.getInteger('amount');

    if (amount === null || amount === undefined || Number.isNaN(amount) || amount < 1 || amount > 100) {
      const errorEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription('❌ Please enter a number between 1 and 100.');
      return ctx.reply({ embeds: [errorEmbed] });
    }

    try {
      // index.js has already deferred this interaction — do NOT defer again here.
      const fetched = await ctx.channel.messages.fetch({ limit: amount });
      const deleted = await ctx.channel.bulkDelete(fetched, true);

      const successEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(`✅ \`${deleted.size}\` messages have been deleted.`);

      // ctx.reply resolves the already-deferred interaction (editReply under the hood).
      await ctx.reply({ embeds: [successEmbed] });

      // Auto-delete the confirmation after 1.5 seconds.
      setTimeout(() => ctx.raw.deleteReply().catch(() => {}), 1500);
    } catch (err) {
      console.error('Clear command error:', err);
      const failEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription('❌ Failed to delete messages (they may be older than 14 days, or I lack permission).');
      await ctx.reply({ embeds: [failEmbed] });
    }
  },
};
