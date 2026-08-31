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
    // طباعة الكائن في الـ Console لمعرفة مكان القيمة بدقة
    console.log("CTX structure:", JSON.stringify(ctx, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    let interaction = ctx.interaction || (ctx.isInteraction && ctx.isInteraction() ? ctx : null);

    if (interaction && !interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }

    try {
      let amount = null;

      // محاولة استخراج القيمة من كافة الأماكن المحتملة
      if (interaction && interaction.options) {
        amount = interaction.options.getInteger?.("amount") ?? 
                 interaction.options.getNumber?.("amount") ?? 
                 interaction.options.get?.("amount")?.value;
      }

      if (!amount && ctx.options) {
        if (typeof ctx.options.getInteger === "function") {
          amount = ctx.options.getInteger("amount");
        } else if (Array.isArray(ctx.options)) {
          const opt = ctx.options.find(o => o.name === "amount");
          if (opt) amount = opt.value;
        } else if (typeof ctx.options === "object") {
          amount = ctx.options.amount || ctx.options._hoistedOptions?.[0]?.value;
        }
      }

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

      // تلوين الرقم بالأخضر داخل التنسيق
      const colorResponse = `\`\`\`json\n"${deletedCount}" messages have been deleted.\n\`\`\``;

      await sendReply(ctx, interaction, colorResponse);

      // حذف رسالة البوت بعد 1.5 ثانية
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
