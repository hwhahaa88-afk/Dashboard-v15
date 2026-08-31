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
      // 1. استخراج الرقم المكتوب في الخيار بدقة
      let amount = interaction.options ? interaction.options.getInteger("amount") : null;
      amount = parseInt(amount);

      if (!amount || isNaN(amount) || amount < 1) amount = 1;
      if (amount > 100) amount = 100;

      const channel = interaction.channel;
      if (!channel) return;

      // 2. تأجيل الرد لتفادي تعليق الـ Interaction
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }

      // 3. مسح الرسائل
      await channel.bulkDelete(amount, true).catch(() => null);

      // 4. كتابة نفس الرقم الذي أدخلته أنت في النص الأخضر
      const greenText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      // 5. تعديل الرد الأساسي فقط بدون إنشاء رسائل جديدة لمنع التكرار
      await interaction.editReply({ content: greenText }).catch(() => {});

      // 6. حذف الرد تلقائياً بعد ثانية ونصف
      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 1500);

    } catch (err) {
      console.error("CLEAR ERROR:", err);
    }
  }
};
