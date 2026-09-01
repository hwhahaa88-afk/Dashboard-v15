const { PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

module.exports = {
  name: 'ban',
  description: 'Ban a user by ID',
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: 'userid',
      type: 3, // STRING
      required: true,
      description: 'The User ID to ban',
    },
    {
      name: 'reason',
      type: 3, // STRING
      required: false,
      description: 'Reason for the ban',
    },
  ],
  async execute(ctx) {
    const userId = (ctx.getString('userid') || '').trim();
    const reason = ctx.getString('reason') || 'No reason provided';

    if (!SNOWFLAKE_REGEX.test(userId)) {
      const errorEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription('❌ | That doesn\'t look like a valid User ID (should be 17-20 digits, no spaces).');
      return ctx.reply({ embeds: [errorEmbed] });
    }

    // Best-effort: fetch the user's tag for a nicer confirmation message.
    // Banning itself works by ID alone even if this fetch fails.
    let displayName = userId;
    try {
      const fetchedUser = await ctx.raw.client.users.fetch(userId);
      displayName = fetchedUser.tag;
    } catch {
      // Unknown/invalid account — we'll still attempt the ban by raw ID.
    }

    // Check if already banned first, to give a clear ProBot-style message.
    const existingBan = await ctx.guild.bans.fetch(userId).catch(() => null);
    if (existingBan) {
      const alreadyEmbed = new EmbedBuilder()
        .setColor(Colors.Yellow)
        .setDescription(`🙄 | ${displayName} is already banned!!`);
      return ctx.reply({ embeds: [alreadyEmbed] });
    }

    try {
      await ctx.guild.bans.create(userId, { reason });
      const successEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(`✅ | ${displayName} has been banned from the server!\n📝 Reason: ${reason}`);
      return ctx.reply({ embeds: [successEmbed] });
    } catch (err) {
      console.error('Ban command error:', err.message);
      const failEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(`❌ | Failed to ban this user: ${err.message}`);
      return ctx.reply({ embeds: [failEmbed] });
    }
  },
};
