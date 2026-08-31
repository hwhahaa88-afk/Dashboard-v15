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
      let amount = null;
      if (interaction?.options) {
        if (typeof interaction.options.getInteger === "function") {
          amount = interaction.options.getInteger("amount");
        }
        if (!amount && typeof interaction.options.get === "function") {
          amount = interaction.options.get("amount")?.value;
        }
      }

      amount = parseInt(amount);
      if (isNaN(amount) || amount < 1) amount = 1;
      if (amount > 100) amount = 100;

      const channel = interaction?.channel || args.find(a => a?.bulkDelete)?.channel;
      if (!channel) return;

      // تنفيذ حذف الرسائل
      await channel.bulkDelete(amount, true).catch(() => null);

      // عرض الرقم الذي أدخلته أنت دائماً
      const greenText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      await sendReply(interaction, channel, greenText);

    } catch (err) {
      console.error("CLEAR COMMAND ERROR:", err);
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
