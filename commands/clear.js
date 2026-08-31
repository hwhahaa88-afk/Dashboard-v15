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
  execute: async (ctx) => {
    let interaction = ctx.interaction || (ctx.isInteraction && ctx.isInteraction() ? ctx : null);

    if (interaction && !interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }

    try {
      let amount = null;

      // استخراج قيمة الرقم المباشرة من تفاصيل الـ interaction
      if (interaction) {
        if (typeof interaction.options?.getInteger === "function") {
          amount = interaction.options.getInteger("amount");
        }
        if (!amount && interaction.options?._hoistedOptions) {
          const opt = interaction.options._hoistedOptions.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        }
        if (!amount && interaction.options?.data) {
          const opt = interaction.options.data.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        }
      }

      if (!amount && ctx.options) {
        if (typeof ctx.options.getInteger === "function") {
          amount = ctx.options.getInteger("amount");
        } else if (typeof ctx.options === "object") {
          amount = ctx.options.amount || ctx.options.value;
        }
      }

      if (!amount && ctx.args && ctx.args[0]) {
        amount = ctx.args[0];
      }

      amount = parseInt(amount);

      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        return sendReply(ctx, interaction, "❌ | Please specify a number between 1 and 100.");
      }

      const channel = interaction ? interaction.channel : ctx.channel;
      if (!channel) return;

      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return sendReply(ctx, interaction, "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).");
      }

      const deletedCount = deleted.size;

      // تلوين الرقم داخل مربع التنسيق باستخدام ansi
      const colorResponse = "```ansi\n\u001b[1;36m" + deletedCount + "\u001b[0m messages have been deleted.\n```";

      await sendReply(ctx, interaction, colorResponse);

      // حذف رسالة البوت بعد ثانية ونصف (1.5s)
      setTimeout(async () => {
        if (interaction) {
          await interaction.deleteReply().catch(() => {});
        } else if (typeof ctx.deleteReply === "function") {
          await ctx.deleteReply().catch(() => {});
        }
      }, 1500);

    } catch (err) {
      console.error("CLEAR ERROR:", err);
      return sendReply(ctx, interaction, "❌ | An error occurred while clearing messages.");
    }
  }
};

async function sendReply(ctx, interaction, content) {
  if (interaction) {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({ content }).catch(() => {});
    }
    return interaction.reply({ content }).catch(() => {});
  }
  if (typeof ctx.editReply === "function") {
    return ctx.editReply({ content }).catch(() => {});
  }
  if (typeof ctx.reply === "function") {
    return ctx.reply(content).catch(() => {});
  }
}
