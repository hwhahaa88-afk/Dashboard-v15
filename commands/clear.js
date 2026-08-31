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
      // 1. قراءة الرقم المدخل بشكل مباشر وصحيح
      let rawAmount = null;
      if (typeof ctx.getInteger === "function") {
        rawAmount = ctx.getInteger("amount");
      } else if (ctx.options?.getInteger) {
        rawAmount = ctx.options.getInteger("amount");
      } else if (ctx.options?.get) {
        rawAmount = ctx.options.get("amount")?.value;
      }

      let amount = parseInt(rawAmount);
      if (isNaN(amount) || amount < 1) amount = 1;
      if (amount > 100) amount = 100;

      // 2. مسح الرسائل فوراً من الروم
      const channel = ctx.channel || ctx.raw?.channel;
      if (channel && typeof channel.bulkDelete === "function") {
        await channel.bulkDelete(amount, true).catch(() => {});
      }

      // 3. تجهيز نص التأكيد الملون باللون الأخضر
      const clearText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      // 4. إنهاء حالة Thinking واستخدام الرد المناسب المتاح
      let sentMsg = null;
      
      if (ctx.raw?.deferred || ctx.deferred) {
        // إذا كان البوت في حالة Thinking فعلياً، نعدل الرد الحالي
        if (ctx.raw?.editReply) {
          sentMsg = await ctx.raw.editReply({ content: clearText }).catch(() => {});
        } else if (ctx.editReply) {
          sentMsg = await ctx.editReply({ content: clearText }).catch(() => {});
        }
      } else {
        // إذا لم يكن في حالة Thinking، نرسل رداً عاماً مباشراً
        if (ctx.reply) {
          sentMsg = await ctx.reply({ content: clearText, fetchReply: true }).catch(() => {});
        } else if (ctx.raw?.reply) {
          sentMsg = await ctx.raw.reply({ content: clearText, fetchReply: true }).catch(() => {});
        }
      }

      // 5. حذف رسالة التأكيد بعد ثانية ونصف
      setTimeout(async () => {
        if (sentMsg?.delete) {
          await sentMsg.delete().catch(() => {});
        } else if (ctx.raw?.deleteReply) {
          await ctx.raw.deleteReply().catch(() => {});
        } else if (ctx.deleteReply) {
          await ctx.deleteReply().catch(() => {});
        }
      }, 1500);

    } catch (err) {
      console.error("Clear execution error:", err);
    }
  }
};
