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

    // Reply INSTANTLY with the optimistic result — this is what eliminates
    // the "is thinking..." flash entirely, since we acknowledge the
    // interaction before waiting on Discord's (sometimes slow) bulkDelete
    // API call. We correct the message afterward only if needed.
    const optimisticEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(`✅ \`${amount}\` messages have been deleted.`);
    const replyPromise = ctx.reply({ embeds: [optimisticEmbed] });

    try {
      const deleted = await ctx.channel.bulkDelete(amount, true);
      await replyPromise;

      if (deleted.size !== amount) {
        // Actual count differs (e.g. some messages were older than 14 days)
        // — silently correct the already-sent message.
        const correctedEmbed = new EmbedBuilder()
          .setColor(Colors.Green)
          .setDescription(`✅ \`${deleted.size}\` messages have been deleted.`);
        await ctx.raw.editReply({ embeds: [correctedEmbed] }).catch(() => {});
      }

      setTimeout(() => ctx.raw.deleteReply().catch(() => {}), 1500);
    } catch (err) {
      console.error('Clear command error:', err.message);
      await replyPromise.catch(() => {});
      const failEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(`❌ Failed to delete messages: ${err.message}`);
      await ctx.raw.editReply({ embeds: [failEmbed] }).catch(() => {});
      setTimeout(() => ctx.raw.deleteReply().catch(() => {}), 1500);
    }
  },
};
