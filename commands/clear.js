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
    // 1. استخراج الـ interaction أو الـ channel بأمان
    let interaction = args.find(a => a && (a.isChatInputCommand?.() || a.isInteraction?.() || a.options));
    if (!interaction && args[0]) {
      interaction = args[0].interaction || args[0].int || args[0];
    }

    try {
      let amount = null;

      // 2. استخراج عدد الرسائل من الـ options
      if (interaction?.options) {
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

      amount = parseInt(amount);
      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        amount = 5;
      }

      const channel = interaction?.channel || args.find(a => a?.bulkDelete)?.channel || args[0]?.channel;
      if (!channel) return;

      // 3. حذف الرسائل أولاً
      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return notify(interaction, channel, "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).");
      }

      const deletedCount = deleted.size;
      const ESC = String.fromCharCode(27);

      // 4. تجهيز النص الملون بالأخضر اللامع بواسطة ANSI
      const colorResponse = "```ansi\n" + ESC + "[1;32m" + deletedCount + ESC + "[0m messages have been deleted.\n```";

      // 5. إرسال الرد وحذفه بعد ثانية ونصف
      await notify(interaction, channel, colorResponse);

    } catch (err) {
      console.error("CLEAR EXECUTION ERROR:", err);
    }
  }
};

async function notify(interaction, channel, text) {
  let msg = null;

  // المحاولة الأولى: تعديل أو إرسال الرد عبر Interaction
  if (interaction) {
    if (interaction.deferred || interaction.replied) {
      msg = await interaction.editReply({ content: text }).catch(() => null);
    } else if (typeof interaction.reply === "function") {
      msg = await interaction.reply({ content: text, fetchReply: true }).catch(() => null);
    }
  }

  // المحاولة الثانية: إذا فشل الـ interaction نرسل مباشرة في القناة
  if (!msg && channel && typeof channel.send === "function") {
    msg = await channel.send(text).catch(() => null);
  }

  // حذف الرسالة بعد 1.5 ثانية (1500 مللي ثانية)
  if (msg) {
    setTimeout(async () => {
      if (typeof msg.delete === "function") {
        await msg.delete().catch(() => {});
      } else if (interaction && typeof interaction.deleteReply === "function") {
        await interaction.deleteReply().catch(() => {});
      }
    }, 1500);
  }
}
