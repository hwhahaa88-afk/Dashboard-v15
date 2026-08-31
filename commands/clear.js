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
    // 1. التعامل المباشر مع Slash Command والرد السريع
    try {
      if (interaction.deferred || interaction.replied) {
        // الرد مؤجل بالفعل
      } else if (typeof interaction.deferReply === "function") {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
      }
    } catch (e) {}

    try {
      // 2. قراءة خيار الرقم مباشرة
      let amount = null;
      
      if (interaction.options) {
        if (typeof interaction.options.getInteger === "function") {
          amount = interaction.options.getInteger("amount");
        } else if (typeof interaction.options.get === "function") {
          amount = interaction.options.get("amount")?.value;
        }
      }

      // إذا لم يجد الرقم، حاول قراءته كأول مدخل في الخيارات
      if (!amount && interaction.options?.data?.[0]) {
        amount = interaction.options.data[0].value;
      }

      amount = parseInt(amount);

      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        const errorContent = "❌ | Please specify a number between 1 and 100.";
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply({ content: errorContent }).catch(() => {});
        }
        return interaction.reply({ content: errorContent, ephemeral: true }).catch(() => {});
      }

      // 3. مسح الرسائل من القناة
      const channel = interaction.channel;
      if (!channel) return;

      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        const failMsg = "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).";
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply({ content: failMsg }).catch(() => {});
        }
        return interaction.reply({ content: failMsg, ephemeral: true }).catch(() => {});
      }

      const deletedCount = deleted.size;
      
      // تلوين الرقم بالأخضر في مربع التنسيق
      const colorResponse = `\`\`\`json\n"${deletedCount}" messages have been deleted.\n\`\`\``;

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: colorResponse }).catch(() => {});
      } else {
        await interaction.reply({ content: colorResponse, ephemeral: true }).catch(() => {});
      }

      // 4. حذف رد البوت تلقائياً بعد ثانية ونصف
      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 1500);

    } catch (err) {
      console.error("CLEAR COMMAND ERROR:", err);
    }
  }
};

