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
      // 1. استخراج العدد المحدد
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

      // 2. إلغاء التأخير وحذف الرسائل من القناة
      const channel = ctx.channel || ctx.raw?.channel;
      if (channel && typeof channel.bulkDelete === "function") {
        await channel.bulkDelete(amount, true).catch(() => {});
      }

      // 3. النص الأخضر المعتمد
      const clearText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      // 4. إرسال رد عام للجميع يحل مشكلة is thinking
      let sentMsg = null;
      if (ctx.raw?.deferred || ctx.deferred) {
        if (ctx.raw?.editReply) {
          sentMsg = await ctx.raw.editReply({ content: clearText }).catch(() => {});
        } else if (ctx.editReply) {
          sentMsg = await ctx.editReply({ content: clearText }).catch(() => {});
        }
      } else {
        if (ctx.reply) {
          sentMsg = await ctx.reply({ content: clearText, fetchReply: true }).catch(() => {});
        } else if (ctx.raw?.reply) {
          sentMsg = await ctx.raw.reply({ content: clearText, fetchReply: true }).catch(() => {});
        }
      }

      // 5. مسح التنبيه بعد 1.5 ثانية
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
