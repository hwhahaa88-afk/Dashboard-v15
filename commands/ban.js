const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a user or member | حظر عضو",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      type: 3,
      required: true,
      description: "User ID or Mention | أيدي أو منشن"
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
    let interaction = ctx.interaction || (ctx.isInteraction && ctx.isInteraction() ? ctx : null);

    if (interaction) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }
    }

    try {
      let rawInput = "";
      if (interaction) {
        rawInput = interaction.options.getString("user") || "";
      } else if (typeof ctx.getString === "function") {
        rawInput = ctx.getString("user") || "";
      }

      const userId = rawInput.replace(/[<@!>]/g, "").trim();

      if (!userId || isNaN(userId)) {
        return sendReply(ctx, interaction, "**❌ | Invalid User ID or Mention.**");
      }

      const client = interaction ? interaction.client : (ctx.client || ctx.guild.client);

      // 1. جلب اسم المستخدم عبر الـ client
      let username = userId;
      if (client && client.users) {
        const userObj = await client.users.fetch(userId).catch(() => null);
        if (userObj) username = userObj.username;
      }

      // 2. الفحص أولاً: هل الحساب متبند سابقاً في السيرفر؟
      const isBanned = await ctx.guild.bans.fetch(userId).catch(() => null);
      if (isBanned) {
        return sendReply(ctx, interaction, `**🙄 | ${username} already banned!!**`);
      }

      const reason = (interaction ? interaction.options.getString("reason") : null) || "No reason provided";
      const time = interaction ? interaction.options.getString("time") : null;
      let bulk = interaction ? interaction.options.getBoolean("bulk") : false;

      let deleteMessageSeconds = bulk ? 7 * 24 * 60 * 60 : 0;
      let banReason = time ? `${reason} (Duration: ${time})` : reason;

      // 3. تنفيذ الحظر
      await ctx.guild.bans.create(userId, {
        reason: banReason,
        deleteMessageSeconds: deleteMessageSeconds
      });

      return sendReply(ctx, interaction, `**✈️ | ${username} has been banned from server**`);

    } catch (err) {
      console.error("BAN ERROR DETAILS:", err);
      let errorMsg = `**❌ | Error Code ${err.code || 'UNKNOWN'}: ${err.message || "Failed to ban"}**`;

      if (err.code === 50013) {
        errorMsg = "**❌ | Missing Permissions: Make sure my bot role is HIGHER than the person you are banning!**";
      } else if (err.code === 10013) {
        errorMsg = "**❌ | Unknown User: Invalid Discord ID.**";
      }

      return sendReply(ctx, interaction, errorMsg);
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
