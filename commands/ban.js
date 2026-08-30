const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a user or member from the server | حظر عضو أو أيدي من السيرفر",
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
    let interaction = ctx.interaction || (ctx.isInteraction ? ctx : null);

    if (interaction && !interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
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

      const reason = (typeof ctx.getString === "function" ? ctx.getString("reason") : null) || "No reason provided";
      const time = typeof ctx.getString === "function" ? ctx.getString("time") : null;
      let bulk = interaction ? interaction.options.getBoolean("bulk") : false;

      let deleteMessageSeconds = bulk ? 7 * 24 * 60 * 60 : 0;
      let banReason = time ? `${reason} (Duration: ${time})` : reason;

      // حظر المستخدم
      const bannedUser = await ctx.guild.bans.create(userId, {
        reason: banReason,
        deleteMessageSeconds: deleteMessageSeconds
      });

      // استخراج اسم المستخدم إذا كان متوفراً وإلا استخدام المنشن/الأيدي
      const username = bannedUser && bannedUser.username ? bannedUser.username : (bannedUser && bannedUser.user ? bannedUser.user.username : `<@${userId}>`);

      return sendReply(ctx, interaction, `**✈️ | ${username} has been banned from server**`);

    } catch (err) {
      console.error("BAN ERROR:", err);

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
