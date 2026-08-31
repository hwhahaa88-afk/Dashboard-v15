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
  execute: async (...args) => {
    // التقاط كائن التفاعل بغض النظر عن ترتيبه في الهاندلر
    let interaction = args.find(a => a && a.options) || args[0];

    if (!interaction || !interaction.guildId) return;

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }

    try {
      let rawInput = interaction.options.getString("user") || "";
      const userId = rawInput.replace(/[<@!>]/g, "").trim();

      if (!userId || isNaN(userId)) {
        return sendReply(interaction, "**❌ | Invalid User ID or Mention.**");
      }

      const reason = interaction.options.getString("reason") || "No reason provided";
      const time = interaction.options.getString("time") || null;
      let bulk = interaction.options.getBoolean("bulk") || false;

      let deleteMessageSeconds = bulk ? 7 * 24 * 60 * 60 : 0;
      let banReason = time ? `${reason} (Duration: ${time})` : reason;

      const client = interaction.client;

      // تجاوز الـ Cache وتوجيه طلب الحظر لخوادم ديسكورد مباشرة لمنع خطأ 'users'
      if (client.rest && typeof client.rest.put === "function") {
        await client.rest.put(
          `/guilds/${interaction.guildId}/bans/${userId}`,
          { 
            reason: banReason, 
            body: { delete_message_seconds: deleteMessageSeconds } 
          }
        );
      } else if (client.api) {
        await client.api.guilds(interaction.guildId).bans(userId).put({
          reason: banReason,
          data: { delete_message_seconds: deleteMessageSeconds }
        });
      } else {
        await interaction.guild.bans.create(userId, { reason: banReason, deleteMessageSeconds });
      }

      return sendReply(interaction, `**✈️ | <@${userId}> has been banned from server**`);

    } catch (err) {
      console.error("BAN ERROR:", err);
      let errorMsg = `**❌ | Error Code ${err.code || 'UNKNOWN'}: ${err.message || "Failed to ban"}**`;

      if (err.code === 50013) {
        errorMsg = "**❌ | Missing Permissions: Make sure my bot role is HIGHER than the person you are banning!**";
      } else if (err.code === 10013 || err.status === 404) {
        errorMsg = "**❌ | Unknown User: Invalid Discord ID.**";
      }

      return sendReply(interaction, errorMsg);
    }
  }
};

async function sendReply(interaction, content) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ content }).catch(() => {});
  }
  return interaction.reply({ content }).catch(() => {});
}
