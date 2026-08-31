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
    let interaction = args.find(a => a && (a.isChatInputCommand?.() || a.isInteraction?.() || a.options));
    if (!interaction && args[0]) {
      interaction = args[0].interaction || args[0].int || args[0];
    }

    try {
      if (interaction && typeof interaction.deferReply === "function" && !interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }

      let amount = null;

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

      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return notify(interaction, channel, "❌ | Failed to delete messages.");
      }

      // عرض الرقم المدخل مباشرة في الرسالة الخضراء
      const greenText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      await notify(interaction, channel, greenText);

    } catch (err) {
      console.error("CLEAR EXECUTION ERROR:", err);
    }
  }
};

async function notify(interaction, channel, text) {
  let msg = null;

  if (interaction) {
    if (interaction.deferred || interaction.replied) {
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
