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
    // 1. تحديد كائن الـ Interaction الحقيقي أو الـ Context
    let interaction = ctx?.interaction || (ctx?.isInteraction && ctx?.isInteraction() ? ctx : null);
    if (!interaction && arg2 && (arg2.isInteraction?.() || arg2.options)) {
      interaction = arg2;
    }

    // 2. الرد الفوري لمنع ظهور The application did not respond
    if (interaction && !interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    } else if (ctx && typeof ctx.deferReply === "function" && !ctx.deferred && !ctx.replied) {
      await ctx.deferReply().catch(() => {});
    }

    try {
      let amount = null;

      // 3. استخراج الرقم بكل الطرق الممكنة في الأطر المخصصة (Custom Handlers)
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

      // البحث داخل ctx المباشر
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

      // تحويل المدخل إلى رقم
      if (typeof amount === "string" || typeof amount === "object") {
        amount = parseInt(amount?.value || amount);
      }

      // إذا تعذر استخراج الرقم، طباعة تنبيه والاعتماد على أول قيمة مُدخلة
      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        return sendReply(ctx, interaction, "❌ | Please specify a number between 1 and 100.");
      }

      // 4. تنفيذ مسح الرسائل
      const channel = interaction?.channel || ctx?.channel;
      if (!channel) return;

      const deleted = await channel.bulkDelete(amount, true).catch(() => null);

      if (!deleted) {
        return sendReply(ctx, interaction, "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).");
      }

      const deletedCount = deleted.size;

      // تلوين الرقم بالأخضر باستخدام تنسيق ANSI
      const colorResponse = "```ansi\n\u001b[1;32m" + deletedCount + "\u001b[0m messages have been deleted.\n```";

      await sendReply(ctx, interaction, colorResponse);

      // 5. حذف رد البوت تلقائياً بعد 1.5 ثانية
      setTimeout(async () => {
        if (interaction && typeof interaction.deleteReply === "function") {
          await interaction.deleteReply().catch(() => {});
        } else if (ctx && typeof ctx.deleteReply === "function") {
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
  if (ctx) {
    if (ctx.deferred || ctx.replied) {
      return ctx.editReply({ content }).catch(() => {});
    }
    if (typeof ctx.reply === "function") {
      return ctx.reply({ content }).catch(() => {});
    }
  }
}
