const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "clear",
  description: "Clear messages | مسح الرسائل",
  permission: PermissionFlagsBits.ManageMessages,
  options: [
    {
      name: "amount",
      type: 4, // INTEGER
      required: true,
      description: "Number of messages to delete | عدد الرسائل"
    }
  ],
  execute: async (interaction) => {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }

      const amount = interaction.options.getInteger("amount") || 1;

      const channel = interaction.channel;
      if (!channel) return;

      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return await interaction.editReply({ content: "❌ | Failed to delete messages." }).catch(() => {});
      }

      const greenText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      await interaction.editReply({ content: greenText }).catch(() => {});

      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 1500);

    } catch (err) {
      console.error("CLEAR ERROR:", err);
    }
  }
};
