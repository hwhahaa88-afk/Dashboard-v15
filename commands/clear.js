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

      // 1. قراءة أي مدخل رقمي تم تمريره في خيارات الـ interaction بغض النظر عن المسمى
      if (interaction && interaction.options) {
        if (typeof interaction.options.getInteger === "function") {
          amount = interaction.options.getInteger("amount");
        }
        
        // إذا لم يجده بالاسم، يبحث في أول خيار مُدخل مهما كان اسمه
        if (!amount && interaction.options.data && interaction.options.data.length > 0) {
          amount = parseInt(interaction.options.data[0].value);
        }
        
        if (!amount && interaction.options._hoistedOptions && interaction.options._hoistedOptions.length > 0) {
          amount = parseInt(interaction.options._hoistedOptions[0].value);
        }
      }

      // 2. إذا كان الأمر عبر الرسائل العادية أو عبر ctx
      if (!amount && ctx.args && ctx.args[0]) {
        amount = parseInt(ctx.args[0]);
      }

      if (!amount && ctx.options) {
        if (Array.isArray(ctx.options) && ctx.options.length > 0) {
          amount = parseInt(ctx.options[0].value || ctx.options[0]);
        } else if (typeof ctx.options === "object") {
          const firstVal = Object.values(ctx.options)[0];
          amount = parseInt(firstVal);
        }
      }

      // التحقق من صحة الرقم
      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        return sendReply(ctx, interaction, "❌ | Please specify a number between 1 and 100.");
      }

      // تنفيذ عملية الحذف
      const deleted = await ctx.channel.bulkDelete(amount, true).catch((e) => {
        console.error("BulkDelete Error:", e);
        return null;
      });

      if (!deleted) {
        return sendReply(ctx, interaction, "❌ | Failed to delete messages (Messages older than 14 days cannot be deleted).");
      }

      const deletedCount = deleted.size;

      // تلوين الرقم داخل مربع النص
      const colorResponse = `\`\`\`json\n"${deletedCount}" messages have been deleted.\n\`\`\``;

      await sendReply(ctx, interaction, colorResponse);

      // حذف رد البوت بعد ثانية ونصف (1.5s)
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
