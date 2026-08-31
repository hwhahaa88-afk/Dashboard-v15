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
  execute: async (ctx, arg2) => {
    // 1. استخراج كائن الـ Interaction
    let interaction = ctx?.interaction || (ctx?.isInteraction && ctx?.isInteraction() ? ctx : null);
    if (!interaction && arg2 && (arg2.isInteraction?.() || arg2.options)) {
      interaction = arg2;
    }

    if (!interaction) return;

    // 2. تأجيل الرد فوراً لتجنب انتهاء المهلة
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }

    try {
      let amount = null;

      // 3. استخراج الرقم بدقة من خيارات الأمر
      if (interaction.options) {
        if (typeof interaction.options.getInteger === "function") {
          amount = interaction.options.getInteger("amount");
        }
        if (!amount && typeof interaction.options.get === "function") {
          amount = interaction.options.get("amount")?.value;
        }
        if (!amount && interaction.options._hoistedOptions?.length > 0) {
          const opt = interaction.options._hoistedOptions.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        }
        if (!amount && interaction.options.data?.length > 0) {
          const opt = interaction.options.data.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        }
      }

      if (!amount && ctx?.args && ctx.args[0]) {
        amount = ctx.args[0];
      }

      amount = parseInt(amount);

      // في حال عدم توفر الرقم، يتم افتراض 5 رسائل بدون إظهار رسالة خطأ
      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        amount = 5;
      }

      // 4. تنفيذ مسح الرسائل
      const channel = interaction.channel;
      if (!channel) return;

      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return interaction.editReply({ content: "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted)." }).catch(() => {});
      }

      const deletedCount = deleted.size;

      // 5. تلوين الرقم بالأخضر اللامع باستخدام ANSI
      const coloredText = "```ansi\n\u001b[1;32m" + deletedCount + "\u001b[0m messages have been deleted.\n```";

      // التحديث على الرد المؤجل بـ رسالة واحدة فقط
      await interaction.editReply({ content: coloredText }).catch(() => {});

      // 6. حذف الرد تلقائياً بعد ثانية ونصف
      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 1500);

    } catch (err) {
      console.error("CLEAR ERROR:", err);
    }
  }
};
