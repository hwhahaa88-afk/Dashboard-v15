const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "kick",
  description: "Kick a member from the server | طرد عضو من السيرفر",
  permission: PermissionFlagsBits.KickMembers,
  options: [
    { name: "user", type: 6, required: true, description: "The member to kick | العضو المراد طرده" },
    { name: "reason", type: 3, required: false, description: "Reason for kick | سبب الطرد" }
  ],
  execute: async (ctx) => {
    try {
      const member = await ctx.getUserMember("user");
      const reason = ctx.getString("reason") || "No reason provided";
      if (!member) return ctx.reply("**❌ | Member not found.**");
      if (!member.kickable) return ctx.reply("**❌ | Cannot kick this member.**");
      await member.kick(reason);
      return ctx.reply("**✅ | Successfully kicked " + (member.user?.username || member.displayName) + " for: " + reason + "**");
    } catch (err) {
      return ctx.reply("**❌ | Failed to kick member.**");
    }
  }
};