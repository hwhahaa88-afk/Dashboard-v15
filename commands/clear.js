const { PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

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
      const deleted = await withTimeout(
        ctx.channel.bulkDelete(amount, true),
        2500,
        'bulkDelete',
      );

      const successEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(`✅ \`${deleted.size}\` messages have been deleted.`);

      await ctx.reply({ embeds: [successEmbed] });
      setTimeout(() => ctx.raw.deleteReply().catch(() => {}), 1500);
    } catch (err) {
      console.error('Clear command error:', err.message);
      const failEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(`❌ Failed to delete messages: ${err.message}`);
      await ctx.reply({ embeds: [failEmbed] }).catch((e) =>
        console.error('Could not even send the failure reply:', e.message),
      );
    }
  },
};
