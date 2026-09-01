const { PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

module.exports = {
  name: 'unban',
  description: 'Unban a user by ID',
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: 'userid',
      type: 3, // STRING
      required: true,
      description: 'The User ID to unban',
    },
  ],
  async execute(ctx) {
    const userId = (ctx.getString('userid') || '').trim();

    if (!SNOWFLAKE_REGEX.test(userId)) {
      const errorEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription('❌ | That doesn\'t look like a valid User ID (should be 17-20 digits, no spaces or line breaks — double-check you copied it correctly).');
      return ctx.reply({ embeds: [errorEmbed] });
    }

    let displayName = userId;
    try {
      const fetchedUser = await ctx.raw.client.users.fetch(userId);
      displayName = fetchedUser.tag;
    } catch {
      // Unknown/invalid account — still attempt the unban by raw ID.
    }

    try {
      await ctx.guild.bans.remove(userId, 'Unbanned via command');
      const successEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(`✅ | ${displayName} has been unbanned!`);
      return ctx.reply({ embeds: [successEmbed] });
    } catch (err) {
      console.error('Unban command error:', err.code, err.message);
      // Discord API error code 10026 = "Unknown Ban" (this ID has no active ban).
      const reasonText = err.code === 10026
        ? 'No active ban found for this ID — double-check you copied it correctly.'
        : err.message;
      const failEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(`❌ | Could not unban this user: ${reasonText}`);
      return ctx.reply({ embeds: [failEmbed] });
    }
  },
};
