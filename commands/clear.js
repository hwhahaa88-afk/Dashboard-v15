const { PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');

module.exports = {
  name: 'clear',
  description: 'Bulk delete messages (1-100)',
  permission: PermissionFlagsBits.ManageChannels,
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

    // index.js defers this interaction publicly (non-ephemeral), which posts
    // a REAL visible message in the channel ("is thinking..."). If we then
    // fetch/delete the channel's latest messages without excluding it, we
    // end up deleting the bot's own pending reply — and the later editReply
    // call fails with "Unknown Message", even though deletion itself worked.
    let ownReplyId = null;
    try {
      const ownReply = await ctx.raw.fetchReply();
      ownReplyId = ownReply.id;
    } catch {
      // If we can't determine it, we proceed anyway — worst case is a rare
      // off-by-one, not a crash.
    }

    try {
      const fetchLimit = Math.min(amount + 1, 100);
      const fetched = await ctx.channel.messages.fetch({ limit: fetchLimit });
      const toDelete = fetched.filter((m) => m.id !== ownReplyId).first(amount);

      const deleted = await ctx.channel.bulkDelete(toDelete, true);

      const successEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(`✅ \`${deleted.size}\` messages have been deleted.`);

      await ctx.reply({ embeds: [successEmbed] });
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
