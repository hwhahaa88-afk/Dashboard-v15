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

      // 1. محاولة استخراج الرقم مباشرة من interaction.options.data أو الطرق المباشرة
      if (interaction && interaction.options) {
        if (typeof interaction.options.getInteger === "function") {
          amount = interaction.options.getInteger("amount");
        }
        if (!amount && interaction.options.data && interaction.options.data.length > 0) {
          const opt = interaction.options.data.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        }
        if (!amount && interaction.options._hoistedOptions && interaction.options._hoistedOptions.length > 0) {
          const opt = interaction.options._hoistedOptions.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        }
      }

      // 2. محاولة استخراج من ctx مباشرة
      if (!amount && ctx.options) {
        if (typeof ctx.options.getInteger === "function") {
          amount = ctx.options.getInteger("amount");
        } else if (Array.isArray(ctx.options)) {
          const opt = ctx.options.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        } else if (typeof ctx.options === "object") {
          amount = ctx.options.amount || ctx.options.value;
        }
      }

      // 3. محاولة استخراج من ctx.args أو ctx.params
      if (!amount && ctx.args && ctx.args[0]) {
        amount = parseInt(ctx.args[0]);
      }
      if (!amount && ctx.params && ctx.params.amount) {
        amount = parseInt(ctx.params.amount);
      }

      if (typeof amount === "string") {
        amount = parseInt(amount);
      }

      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        return sendReply(ctx, interaction, "❌ | Please specify a number between 1 and 100.");
      }

      const deleted = await ctx.channel.bulkDelete(amount, true).catch((e) => {
        console.error("BulkDelete Error:", e);
        return null;
      });

      if (!deleted) {
        return sendReply(ctx, interaction, "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).");
      }

      const deletedCount = deleted.size;
      const colorResponse = `\`\`\`json\n"${deletedCount}" messages have been deleted.\n\`\`\``;

      await sendReply(ctx, interaction, colorResponse);

      setTimeout(async () => {
        if (interaction) {
          await interaction.deleteReply().catch(() => {});
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
  if (typeof ctx.reply === "function") {
    return ctx.reply(content).catch(() => {});
  }
}
