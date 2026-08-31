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
    // 1. استخراج كائن Interaction
    let interaction = args.find(a => a && (typeof a.isChatInputCommand === "function" || typeof a.isInteraction === "function" || a.options));
    
    if (!interaction && args[0]) {
      interaction = args[0].interaction || args[0].int || args[0];
    }

    if (!interaction) return;

    // 2. تجنب التكرار وإلغاء الاستجابات المتعددة
    if (interaction.replied || interaction.deferred) {
      return;
    }

    // تأجيل الرد فوراً لتجنب انتهاء المهلة (The application did not respond)
    await interaction.deferReply().catch(() => {});

    try {
      let amount = null;

      // 3. استخراج الرقم الممرر للأمر
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

      if (!amount) {
        for (let arg of args) {
          if (typeof arg === "number") { amount = arg; break; }
          if (arg && typeof arg === "object" && arg.amount) { amount = arg.amount; break; }
        }
      }

      amount = parseInt(amount);

      // إذا لم يتحدد الرقم يتم تعيين 5 كحد افتراضي بدون إظهار رسالة خطأ
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
      const ESC = String.fromCharCode(27);

      // 5. تلوين الرقم بالأخضر اللامع باستخدام ANSI
      const colorResponse = "```ansi\n" + ESC + "[1;32m" + deletedCount + ESC + "[0m messages have been deleted.\n```";

      // إرسال الرد
      await interaction.editReply({ content: colorResponse }).catch(() => {});

      // 6. حذف الرد تلقائياً بعد ثانية ونصف
      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 1500);

    } catch (err) {
      console.error("CLEAR ERROR:", err);
    }
  }
};
