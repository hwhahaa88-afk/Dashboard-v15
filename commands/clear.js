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
      const amount = interaction.options.getInteger("amount") || 5;
      const channel = interaction.channel;

      if (!channel) return;

      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return interaction.reply({ content: "❌ | Failed to delete messages.", ephemeral: true }).catch(() => {});
      }

      const greenText = "```diff\n+ " + deleted.size + " messages have been deleted.\n```";

      // إرسال الرد الأخضر مباشرة
      await interaction.reply({ content: greenText }).catch(() => {});

      // حذف الرد بعد 1.5 ثانية
      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 1500);

    } catch (err) {
      console.error("CLEAR ERROR:", err);
    }
  }
};
