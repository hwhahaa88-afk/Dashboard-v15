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
    let interaction = args.find(a => a && typeof a === "object" && (a.options || a.channel || a.reply));
    if (!interaction && args[0]) {
      interaction = args[0].interaction || args[0].int || args[0];
    }

    try {
      // 1. جلب الرقم المدخل المباشر
      let requestedAmount = 1;

      if (interaction?.options) {
        if (typeof interaction.options.getInteger === "function") {
          requestedAmount = interaction.options.getInteger("amount") || requestedAmount;
        } else if (typeof interaction.options.get === "function") {
          requestedAmount = interaction.options.get("amount")?.value || requestedAmount;
        } else if (interaction.options._hoistedOptions) {
          const opt = interaction.options._hoistedOptions.find(o => o.name === "amount");
          if (opt) requestedAmount = opt.value;
        }
      }

      requestedAmount = parseInt(requestedAmount);
      if (isNaN(requestedAmount) || requestedAmount < 1) requestedAmount = 1;
      if (requestedAmount > 100) requestedAmount = 100;

      const channel = interaction?.channel || args.find(a => a?.bulkDelete)?.channel;
      if (!channel) return;

      // 2. مسح الرسائل في Discord
      await channel.bulkDelete(requestedAmount, true).catch(() => null);

      // 3. عرض الرقم المطلوب المباشر في الرسالة الخضراء
      const greenText = "```diff\n+ " + requestedAmount + " messages have been deleted.\n```";

      // 4. إرسال الرد
      await sendReply(interaction, channel, greenText);

    } catch (err) {
      console.error("CLEAR ERROR:", err);
    }
  }
};

async function sendReply(interaction, channel, text) {
  let msg = null;

  if (interaction) {
    if (typeof interaction.editReply === "function" && (interaction.deferred || interaction.replied)) {
      msg = await interaction.editReply({ content: text }).catch(() => null);
    } else if (typeof interaction.reply === "function") {
      msg = await interaction.reply({ content: text, fetchReply: true }).catch(() => null);
    }
  }

  if (!msg && channel && typeof channel.send === "function") {
    msg = await channel.send(text).catch(() => null);
  }

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
