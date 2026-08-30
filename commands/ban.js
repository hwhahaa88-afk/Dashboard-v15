const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a user by ID or mention | حظر شخص بالأيدي أو المنشن",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      type: 3,
      required: true,
      description: "User ID or Mention | أيدي أو منشن الشخص"
    },
    {
      name: "time",
      type: 3,
      required: false,
      description: "Ban duration | مدة الحظر"
    },
    {
      name: "reason",
      type: 3,
      required: false,
      description: "Reason | السبب"
    },
    {
      name: "bulk",
      type: 5,
      required: false,
      description: "Delete messages | مسح الرسائل"
    }
  ],
  execute: async (ctx) => {
    const interaction = ctx.interaction || ctx;
    if (interaction.deferReply) await interaction.deferReply().catch(() => {});

    try {
      let raw = "";
      if (interaction.options) {
        raw = interaction.options.getString("user") || "";
      } else if (typeof ctx.getString === "function") {
        raw = ctx.getString("user") || "";
      }

      const id = raw.replace(/[<@!>]/g, "").trim();

      if (!id || isNaN(id)) {
        const msg = "**❌ | الأيدي غير صحيح أو لم يتم إدخاله بشكل صحيح.**";
        return interaction.editReply ? interaction.editReply(msg) : ctx.reply(msg);
      }

      const reason = (interaction.options ? interaction.options.getString("reason") : null) || "No reason provided";

      await ctx.guild.bans.create(id, { reason });

      const successMsg = `**✅ | تم حظر الحساب بنجاح!**\n**الأيدي:** \`${id}\``;
      return interaction.editReply ? interaction.editReply(successMsg) : ctx.reply(successMsg);

    } catch (err) {
      console.error(err);
      let errMsg = `**❌ | خطأ أثناء الحظر (Code ${err.code || 'UNKNOWN'}): ${err.message}**`;
      if (err.code === 50013) {
        errMsg = "**❌ | خطأ في الصلاحيات: ارفع رتبة البوت لتكون أعلى رتبة في السيرفر (Server Settings > Roles).**";
      } else if (err.code === 10013) {
        errMsg = "**❌ | هذا الأيدي غير موجود في ديسكورد.**";
      }
      return interaction.editReply ? interaction.editReply(errMsg) : ctx.reply(errMsg);
    }
  }
};
