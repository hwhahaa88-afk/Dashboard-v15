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
    const amount = ctx.options.getInteger('amount');

    if (amount === null || amount === undefined || Number.isNaN(amount) || amount < 1 || amount > 100) {
      const errorEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription('❌ Please enter a number between 1 and 100.');
      // Not deferred yet at this point, so a plain reply is correct here.
      return ctx.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    try {
      // Guard against double-defer/double-reply, which is what silently
      // breaks the interaction and causes "did not respond".
      if (!ctx.deferred && !ctx.replied) {
        await ctx.deferReply({ ephemeral: false }); // public, visible to everyone
      }

      const fetched = await ctx.channel.messages.fetch({ limit: amount });
      const deleted = await ctx.channel.bulkDelete(fetched, true);

      const successEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(`✅ **${deleted.size}** messages have been deleted.`);

      // Resolve the interaction itself with editReply — this is what marks
      // it as "responded" in Discord's eyes. Sending a separate channel
      // message instead of this is exactly what caused the original bug.
      await ctx.editReply({ embeds: [successEmbed] });

      // Now that the interaction is properly resolved, auto-delete after 1.5s.
      setTimeout(() => ctx.deleteReply().catch(() => {}), 1500);
    } catch (err) {
      console.error('Clear command error:', err);
      try {
        const failEmbed = new EmbedBuilder()
          .setColor(Colors.Red)
          .setDescription('❌ Failed to delete messages (they may be older than 14 days, or I lack permission).');
        if (ctx.deferred || ctx.replied) {
          await ctx.editReply({ embeds: [failEmbed] });
        } else {
          await ctx.reply({ embeds: [failEmbed], ephemeral: true });
        }
      } catch {}
    }
  },
};
