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

      // دالة لاستخراج أي رقم موجود داخل أي كائن متداخل
      const findNumberInObject = (obj) => {
        if (!obj) return null;
        if (typeof obj === "number" && !isNaN(obj)) return obj;
        if (typeof obj === "string" && !isNaN(parseInt(obj)) && parseInt(obj) > 0) return parseInt(obj);

        if (Array.isArray(obj)) {
          for (let item of obj) {
            let res = findNumberInObject(item);
            if (res) return res;
          }
        } else if (typeof obj === "object") {
          if (obj.value !== undefined) {
            let res = findNumberInObject(obj.value);
            if (res) return res;
          }
          for (let key in obj) {
            if (key === "client" || key === "guild" || key === "channel" || key === "user" || key === "member") continue;
            let res = findNumberInObject(obj[key]);
            if (res) return res;
          }
        }
        return null;
      };

      // 1. محاولة استخراج الرقم بالدالة الرسمية
      if (interaction && interaction.options && typeof interaction.options.getInteger === "function") {
        amount = interaction.options.getInteger("amount");
      }

      // 2. إذا فشل، ابحث في خيارات interaction.options.data
      if (!amount && interaction && interaction.options && interaction.options.data) {
        amount = findNumberInObject(interaction.options.data);
      }

      // 3. البحث في كل كائن ctx كخيار أخير
      if (!amount) {
        amount = findNumberInObject(ctx.options || ctx.args || ctx.params);
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

      // تلوين الرقم داخل المربع
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
