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
    // 1. الاستجابة الفورية لتجنب The application did not respond
    let interaction = ctx.interaction || (ctx.isInteraction && ctx.isInteraction() ? ctx : null);

    if (interaction) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }
    } else if (typeof ctx.deferReply === "function") {
      await ctx.deferReply().catch(() => {});
    }

    try {
      let amount = null;

      // 2. استخراج سريع ومباشر للرقم
      if (interaction && interaction.options) {
        amount = interaction.options.getInteger("amount") || 
                 interaction.options.getNumber("amount") || 
                 interaction.options.get("amount")?.value;
        
        if (!amount && interaction.options.data && interaction.options.data[0]) {
          amount = interaction.options.data[0].value;
        }
      }

      if (!amount && ctx.options) {
        if (typeof ctx.options.getInteger === "function") {
          amount = ctx.options.getInteger("amount");
        } else if (typeof ctx.options === "object") {
          amount = ctx.options.amount || Object.values(ctx.options)[0];
        }
      }

      if (!amount && ctx.args && ctx.args[0]) {
        amount = ctx.args[0];
      }

      // تحويل القيمة لرقم
      amount = parseInt(amount);

      // في حال لم يتم تحديد رقم صالح، اجعل القيمة الافتراضية 5 رسائل
      if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
        amount = 5;
      }

      // 3. تنفيذ الحذف
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
