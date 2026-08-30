const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "warn",
  description: "Warn a member | إعطاء تحذير لعضو",
  permission: PermissionFlagsBits.ManageMessages,
  options: [
    { name: "user", type: 6, required: true, description: "The member | العضو" },
    { name: "reason", type: 3, required: false, description: "Reason | السبب" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      const reason = ctx.getString("reason") || "No reason provided";
      if (!member) return ctx.reply("**❌ | Member not found.**");
      return ctx.reply("**⚠️ | Warned " + (member.user?.username || member.displayName) + " for: " + reason + "**");
    } catch (err) {
      return ctx.reply("**❌ | Failed to warn member.**");
    }
  }
};