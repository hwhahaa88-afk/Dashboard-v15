const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "timeout",
  description: "Timeout a member | عزل مؤقت لعضو",
  permission: PermissionFlagsBits.ModerateMembers,
  options: [
    { name: "user", type: 6, required: true, description: "The member | العضو" },
    { name: "minutes", type: 4, required: true, description: "Minutes | الدقائق" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      const minutes = ctx.getInteger("minutes");
      if (!member) return ctx.reply("**❌ | Member not found.**");
      await member.timeout(minutes * 60 * 1000);
      return ctx.reply("**✅ | Successfully timed out " + (member.user?.username || member.displayName) + " for " + minutes + " minutes.**");
    } catch (err) {
      return ctx.reply("**❌ | Could not timeout member.**");
    }
  }
};