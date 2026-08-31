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

    // 1. الاستجابة الفورية لمنع التأخير
    if (interaction && !interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }

    try {
      let rawAmount = null;

      // 2. البحث عن القيمة في كافة الأماكن الممكنة
      if (interaction && interaction.options) {
        if (typeof interaction.options.getInteger === "function") {
          rawAmount = interaction.options.getInteger("amount");
        }
        if (!rawAmount && typeof interaction.options.get === "function") {
          rawAmount = interaction.options.get("amount")?.value;
        }
        if (!rawAmount && interaction.options.data && interaction.options.data.length > 0) {
          rawAmount = interaction.options.data[0].value;
        }
        if (!rawAmount && interaction.options._hoistedOptions && interaction.options._hoistedOptions.length > 0) {
          rawAmount = interaction.options._hoistedOptions[0].value;
        }
      }

      if (!rawAmount && ctx.options) {
        if (typeof ctx.options.getInteger === "function") {
          rawAmount = ctx.options.getInteger("amount");
        } else if (typeof ctx.options === "object") {
          rawAmount = ctx.options.amount || Object.values(ctx.options)[0];
        }
      }

      if (!rawAmount && ctx.args && ctx.args[0]) {
        rawAmount = ctx.args[0];
      }

      // تحويل المدخل إلى رقم صحبح
      let amount = parseInt(rawAmount);

      // إذا لم يتحدد الرقم لأي سبب، افتراضياً يحذف 5 رسائل لتجنب إظهار رسالة الخطأ
      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        amount = 5;
      }

      // 3. مسح الرسائل
      const channel = interaction ? interaction.channel : ctx.channel;
      if (!channel) return;

      const deleted = await channel.bulkDelete(amount, true).catch((e) => {
        console.error("BulkDelete Error:", e);
        return null;
      });

      if (!deleted) {
        return sendReply(ctx, interaction, "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).");
      }

      const deletedCount = deleted.size;

      // تلوين الرقم داخل المربع
      const colorResponse = `\`\`\`json\n"${deletedCount}" messages have been deleted.\n\`\`\``;

      await sendReply(ctx, interaction, colorResponse);

      // 4. حذف رد البوت بعد ثانية ونصف (1.5s)
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
