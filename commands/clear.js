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

      // استخراج قيمة الرقم بأكثر من طريقة مضمونة
      if (interaction) {
        const optionObj = interaction.options.get("amount");
        amount = optionObj ? parseInt(optionObj.value) : null;
      } else if (ctx.options) {
        const optionObj = typeof ctx.options.get === "function" ? ctx.options.get("amount") : null;
        amount = optionObj ? parseInt(optionObj.value) : parseInt(ctx.options.amount);
      } else if (ctx.args && ctx.args[0]) {
        amount = parseInt(ctx.args[0]);
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

      // تلوين الرقم داخل مربع التنسيق
      const colorResponse = `\`\`\`json\n"${deletedCount}" messages have been deleted.\n\`\`\``;

      await sendReply(ctx, interaction, colorResponse);

      // حذف رسالة البوت تلقائياً بعد ثانية ونصف
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
