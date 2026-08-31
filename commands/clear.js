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
  async execute(interaction) {
    // التعامل المباشر مع interaction سواء كان يدوياً أو عبر ctx
    const int = interaction.interaction || interaction.raw || interaction;

    try {
      // 1. التأجيل المباشر الفوري قبل أي معالجة لتجنب Is Thinking
      if (typeof int.deferReply === "function" && !int.deferred && !int.replied) {
        await int.deferReply().catch(() => {});
      }

      // 2. قراءة قيمة الرقم مباشرة
      let amount = 1;
      if (int.options?.getInteger) {
        amount = int.options.getInteger("amount");
      } else if (int.options?.get) {
        amount = int.options.get("amount")?.value;
      }

      amount = parseInt(amount);
      if (isNaN(amount) || amount < 1) amount = 1;
      if (amount > 100) amount = 100;

      // 3. تنفيذ مسح الرسائل
      const channel = int.channel;
      if (channel && typeof channel.bulkDelete === "function") {
        await channel.bulkDelete(amount, true).catch(() => null);
      }

      // 4. إرسال الرسالة الخضراء بالرقم المطلوب
      const clearText = "```diff\n+ " + amount + " messages have been deleted.\n```";

      let responseMsg = null;
      if (typeof int.editReply === "function") {
        responseMsg = await int.editReply({ content: clearText }).catch(() => null);
      } else if (typeof int.reply === "function") {
        responseMsg = await int.reply({ content: clearText, fetchReply: true }).catch(() => null);
      }

      // 5. حذف رسالة التأكيد بعد ثانية ونصف
      setTimeout(async () => {
        if (responseMsg?.delete) {
          await responseMsg.delete().catch(() => {});
        } else if (typeof int.deleteReply === "function") {
          await int.deleteReply().catch(() => {});
        }
      }, 1500);

    } catch (err) {
      console.error("Clear Error:", err);
      if (int && typeof int.editReply === "function") {
        await int.editReply({ content: "❌ | حدث خطأ أثناء تنفيذ الأمر." }).catch(() => {});
      }
    }
  }
};
