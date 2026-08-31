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
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }

    try {
      let amount = 0;
      if (interaction) {
        amount = interaction.options.getInteger("amount");
      } else if (typeof ctx.getInteger === "function") {
        amount = ctx.getInteger("amount");
      }

      if (!amount || amount < 1 || amount > 100) {
        return sendReply(ctx, interaction, "❌ | Please specify a number between 1 and 100.");
      }

      const deleted = await ctx.channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return sendReply(ctx, interaction, "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).");
      }

      const deletedCount = deleted.size;

      // تنسيق النص بالألوان (ANSI Code) لجعل الرقم ملوناً
      const colorResponse = "```ansi\n\u001b[1;31m" + deletedCount + "\u001b[0m messages have been deleted.\n```";

      return sendReply(ctx, interaction, colorResponse);

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
    return interaction.reply({ content, ephemeral: true }).catch(() => {});
  }
  if (typeof ctx.reply === "function") {
    return ctx.reply(content).catch(() => {});
  }
}
