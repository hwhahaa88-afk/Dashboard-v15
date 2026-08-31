const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "clear",
  description: "Bulk delete messages (1-100) | حذف عدد من الرسائل",
  permission: PermissionFlagsBits.ManageMessages,
  options: [
    {
      name: "amount",
      type: 4, // INTEGER
      required: true,
      description: "Number of messages to delete (1-100) | عدد الرسائل"
    }
  ],
  async execute(ctx) {
    try {
      // 1. قراءة الرقم المدخل
      let amount = 1;
      if (ctx?.options?.getInteger) {
        amount = ctx.options.getInteger("amount");
      } else if (ctx?.getInteger) {
        amount = ctx.getInteger("amount");
      }

      amount = parseInt(amount);
      if (isNaN(amount) || amount < 1) amount = 1;
      if (amount > 100) amount = 100;

      const channel = ctx.channel;
      if (!channel) return;

      // 2. تأجيل الرد عامة (غير مخفية) لتجنب خطأ التايم أوت
      if (ctx.deferReply && typeof ctx.deferReply === "function") {
        await ctx.deferReply({ flags: 0 }).catch(() => {});
      } else if (ctx.raw?.deferReply && typeof ctx.raw.deferReply === "function") {
        await ctx.raw.deferReply().catch(() => {});
      }

      // 3. مسح الرسائل
      await channel.bulkDelete(amount, true).catch(() => null);

      // 4. النص الأخضر المعتمد بالرقم الذي كتبته
      const clearText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      // 5. تعديل الرد لإظهاره للجميع
      let response = null;
      if (ctx.editReply && typeof ctx.editReply === "function") {
        response = await ctx.editReply({ content: clearText }).catch(() => null);
      } else if (ctx.raw?.editReply && typeof ctx.raw.editReply === "function") {
        response = await ctx.raw.editReply({ content: clearText }).catch(() => null);
      } else if (ctx.reply && typeof ctx.reply === "function") {
        response = await ctx.reply({ content: clearText, fetchReply: true }).catch(() => null);
      }

      // 6. حذف رسالة التأكيد العامة تلقائياً بعد ثانية ونصف
      setTimeout(async () => {
        if (response?.delete) {
          await response.delete().catch(() => {});
        } else if (ctx.deleteReply && typeof ctx.deleteReply === "function") {
          await ctx.deleteReply().catch(() => {});
        } else if (ctx.raw?.deleteReply && typeof ctx.raw.deleteReply === "function") {
          await ctx.raw.deleteReply().catch(() => {});
        }
      }, 1500);

    } catch (err) {
      console.error("Clear error:", err);
    }
  }
};
