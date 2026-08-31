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
      // 1. التأكد من تأجيل الرد مرة واحدة فقط
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }

      // 2. جلب الرقم المدخل بدقة عالية
      let amount = interaction.options?.getInteger("amount") 
                || interaction.options?.get("amount")?.value 
                || 1;

      amount = parseInt(amount);
      if (isNaN(amount) || amount < 1) amount = 1;
      if (amount > 100) amount = 100;

      const channel = interaction.channel;
      if (!channel) return;

      // 3. مسح الرسائل
      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return await interaction.editReply({ content: "❌ | Failed to delete messages." }).catch(() => {});
      }

      // 4. عرض نفس الرقم المدخل بأسلوب diff الأخضر
      const greenText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      // 5. تعديل الرد وتجنب إرسال رسائل مضاعفة
      await interaction.editReply({ content: greenText }).catch(() => {});

      // 6. حذف الرد بعد ثانية ونصف
      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 1500);

    } catch (err) {
      console.error("CLEAR ERROR:", err);
    }
  }
};
