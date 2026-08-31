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
  execute: async (ctx, arg2) => {
    let interaction = ctx?.interaction || (ctx?.isInteraction && ctx?.isInteraction() ? ctx : null);
    if (!interaction && arg2 && (arg2.isInteraction?.() || arg2.options)) {
      interaction = arg2;
    }

    // 1. الاستجابة الفورية المخفية (ephemeral) أو المؤجلة
    if (interaction && !interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }

    try {
      let amount = null;

      // 2. استخراج قيمة الرقم
      if (interaction && interaction.options) {
        if (typeof interaction.options.getInteger === "function") {
          amount = interaction.options.getInteger("amount");
        }
        if (!amount && typeof interaction.options.get === "function") {
          amount = interaction.options.get("amount")?.value;
        }
        if (!amount && interaction.options._hoistedOptions?.length > 0) {
          amount = interaction.options._hoistedOptions[0].value;
        }
        if (!amount && interaction.options.data?.length > 0) {
          amount = interaction.options.data[0].value;
        }
      }

      if (!amount && ctx) {
        if (typeof ctx.getInteger === "function") {
          amount = ctx.getInteger("amount");
        } else if (ctx.options) {
          if (typeof ctx.options.getInteger === "function") {
            amount = ctx.options.getInteger("amount");
          } else if (typeof ctx.options === "object") {
            amount = ctx.options.amount || ctx.options._hoistedOptions?.[0]?.value || Object.values(ctx.options)[0];
          }
        } else if (ctx.args && ctx.args[0]) {
          amount = ctx.args[0];
        }
      }

      if (typeof amount === "string" || typeof amount === "object") {
        amount = parseInt(amount?.value || amount);
      }

      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        return sendReply(ctx, interaction, "❌ | Please specify a number between 1 and 100.");
      }

      const channel = interaction?.channel || ctx?.channel;
      if (!channel) return;

      // 3. حذف الرسائل أولاً من القناة
      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return sendReply(ctx, interaction, "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).");
      }

      const deletedCount = deleted.size;

      // 4. إرسال الرسالة الملونة بالأخضر اللامع (ANSI) كرسالة عادية في القناة لتشاهدها
      const colorResponse = "```ansi\n\u001b[1;32m" + deletedCount + "\u001b[0m messages have been deleted.\n```";

      // نرسل الرد كرسالة جديدة في القناة لتبقى واضحة
      const sentMsg = await channel.send(colorResponse).catch(() => null);

      // تنظيف الـ interaction المؤجل إن وجد
      if (interaction) {
        await interaction.deleteReply().catch(() => {});
      }

      // 5. حذف رسالة التأكيد بعد ثانية ونصف (1.5 ثانية)
      if (sentMsg) {
        setTimeout(async () => {
          await sentMsg.delete().catch(() => {});
        }, 1500);
      }

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
  if (ctx && typeof ctx.reply === "function") {
    return ctx.reply({ content }).catch(() => {});
  }
}
