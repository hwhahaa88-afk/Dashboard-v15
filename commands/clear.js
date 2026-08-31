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
      // 1. جلب الرقم المكتوب مباشرة
      let amount = ctx.options?.getInteger("amount") || ctx.getInteger?.("amount") || 1;
      amount = Math.min(Math.max(parseInt(amount) || 1, 1), 100);

      // 2. مسح الرسائل فوراً من الروم
      await ctx.channel.bulkDelete(amount, true).catch(() => {});

      // 3. إرسال النص الأخضر العام للجميع بدون تأخير وبدون ephemeral
      const msgContent = "```diff\n+ " + amount + " messages have been deleted.\n```";

      let replyMsg;
      if (ctx.reply) {
        replyMsg = await ctx.reply({ content: msgContent, fetchReply: true }).catch(() => {});
      } else if (ctx.raw?.reply) {
        replyMsg = await ctx.raw.reply({ content: msgContent, fetchReply: true }).catch(() => {});
      }

      // 4. حذف رسالة التأكيد بعد 1.5 ثانية
      setTimeout(() => {
        if (replyMsg?.delete) {
          replyMsg.delete().catch(() => {});
        } else if (ctx.deleteReply) {
          ctx.deleteReply().catch(() => {});
        }
      }, 1500);

    } catch (err) {
      console.error("Clear Command Error:", err);
    }
  }
};
