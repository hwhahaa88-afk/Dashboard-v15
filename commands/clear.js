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
      let amount = 0;
      if (interaction) {
        amount = interaction.options.getInteger("amount");
      } else if (typeof ctx.getString === "function") {
        amount = parseInt(ctx.getString("amount"));
      }

      if (!amount || amount < 1 || amount > 100) {
        return sendReply(ctx, interaction, "❌ | Please specify a number between 1 and 100.");
      }

      const deleted = await ctx.channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return sendReply(ctx, interaction, "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).");
      }

      const deletedCount = deleted.size;

      // تنسيق الرقم بلون واضح ومختلف (استخدام syntax highlighting)
      const colorResponse = `\`\`\`prolog\n${deletedCount} messages have been deleted.\n\`\`\``;

      // إرسال الرد وتخزين الرسالة لحذفها بعد 1.5 ثانية
      const msg = await sendReply(ctx, interaction, colorResponse);

      setTimeout(async () => {
        if (interaction) {
          await interaction.deleteReply().catch(() => {});
        } else if (msg && typeof msg.delete === "function") {
          await msg.delete().catch(() => {});
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
