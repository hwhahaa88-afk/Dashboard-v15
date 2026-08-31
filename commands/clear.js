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
    // 1. التعامل مع التأجيل الآمن لمنع تكرار deferReply
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }

    try {
      let amount = null;

      // 2. استخراج الرقم المدخل من خيارات Slash Command
      if (interaction.options) {
        if (typeof interaction.options.getInteger === "function") {
          amount = interaction.options.getInteger("amount");
        }
        if (!amount && typeof interaction.options.get === "function") {
          amount = interaction.options.get("amount")?.value;
        }
        if (!amount && interaction.options._hoistedOptions) {
          const opt = interaction.options._hoistedOptions.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        }
        if (!amount && interaction.options.data) {
          const opt = interaction.options.data.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        }
      }

      amount = parseInt(amount);

      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        amount = 5;
      }

      // 3. تنفيذ حذف الرسائل
      const channel = interaction.channel;
      if (!channel) return;

      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        const failMsg = "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).";
        return interaction.editReply({ content: failMsg }).catch(() => {});
      }

      const deletedCount = deleted.size;
      const ESC = String.fromCharCode(27);

      // 4. التلوين باللون الأخضر اللامع
      const colorResponse = "```ansi\n" + ESC + "[1;32m" + deletedCount + ESC + "[0m messages have been deleted.\n```";

      // 5. تعديل الرد المباشر
      await interaction.editReply({ content: colorResponse }).catch(() => {});

      // 6. حذف الرد تلقائياً بعد 1.5 ثانية
      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 1500);

    } catch (err) {
      console.error("CLEAR COMMAND ERROR:", err);
    }
  }
};
