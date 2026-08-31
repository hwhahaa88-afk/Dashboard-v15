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
  execute: async (...args) => {
    // 1. البحث عن كائن interaction الحقيقي من المعاملات المرسلة
    let interaction = args.find(a => a && (a.isChatInputCommand?.() || a.isInteraction?.() || a.commandName));
    
    // إذا لم يجده، يفحص الخصائص الداخلية لـ ctx
    if (!interaction && args[0]) {
      interaction = args[0].interaction || args[0].int || args[0];
    }

    if (!interaction) return;

    // 2. تأكيد الاستجابة الفورية لتجنب انتهاء المهلة
    try {
      if (!interaction.deferred && !interaction.replied && typeof interaction.deferReply === "function") {
        await interaction.deferReply({ ephemeral: false }).catch(() => {});
      }
    } catch (e) {}

    try {
      let amount = null;

      // 3. استخراج القيمة بكل الطرق المضمونة في Discord.js
      if (interaction.options) {
        if (typeof interaction.options.getInteger === "function") {
          amount = interaction.options.getInteger("amount");
        }
        if (!amount && typeof interaction.options.get === "function") {
          amount = interaction.options.get("amount")?.value;
        }
        if (!amount && interaction.options.data && interaction.options.data.length > 0) {
          const opt = interaction.options.data.find(o => o.name === "amount");
          if (opt) amount = opt.value;
          else amount = interaction.options.data[0].value;
        }
        if (!amount && interaction.options._hoistedOptions && interaction.options._hoistedOptions.length > 0) {
          const opt = interaction.options._hoistedOptions.find(o => o.name === "amount");
          if (opt) amount = opt.value;
          else amount = interaction.options._hoistedOptions[0].value;
        }
      }

      // تحويل القيمة لرقم صحيح
      if (typeof amount === "string") amount = parseInt(amount);

      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        const errorMsg = "❌ | Please specify a number between 1 and 100.";
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply({ content: errorMsg }).catch(() => {});
        }
        return interaction.reply({ content: errorMsg }).catch(() => {});
      }

      // 4. تنفيذ مسح الرسائل
      const channel = interaction.channel;
      if (!channel) return;

      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        const failMsg = "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).";
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply({ content: failMsg }).catch(() => {});
        }
        return interaction.reply({ content: failMsg }).catch(() => {});
      }

      const deletedCount = deleted.size;

      // تلوين الرقم بالأزرق اللامع عبر أكواد ANSI
      const colorResponse = "```ansi\n\u001b[1;34m" + deletedCount + "\u001b[0m messages have been deleted.\n```";

      // إرسال الرد
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: colorResponse }).catch(() => {});
      } else {
        await interaction.reply({ content: colorResponse }).catch(() => {});
      }

      // 5. حذف رد البوت تلقائياً بعد 1.5 ثانية (1500 مللي ثانية)
      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 1500);

    } catch (err) {
      console.error("CLEAR EXECUTE ERROR:", err);
    }
  }
};
