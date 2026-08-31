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
      // 1. تأجيل الرد فوراً لتفادي خطأ عدم الاستجابة
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }

      // 2. قراءة الرقم المدخل
      let amount = interaction.options ? interaction.options.getInteger("amount") : null;
      amount = parseInt(amount);

      if (!amount || isNaN(amount) || amount < 1) amount = 1;
      if (amount > 100) amount = 100;

      const channel = interaction.channel;
      if (!channel) return;

      // 3. تنفيذ عملية الحذف
      await channel.bulkDelete(amount, true).catch(() => null);

      // 4. تجهيز النص الأخضر بالرقم الذي كتبته
      const greenText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      // 5. تعديل الرد المأجل
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
