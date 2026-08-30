const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "user",
  description: "Display user info | معلومات العضو",
  options: [
    {
        "name": "user",
        "type": 6,
        "required": false,
        "description": "Select user"
    }
],
  execute: async (ctx) => {
    try {
      const member = (await ctx.getUserMember("user")) || ctx.member;
      return ctx.reply("**👤 | User: " + member.user.tag + "\n🆔 | ID: " + member.id + "**");
    } catch (err) {
      return ctx.reply("**❌ | Could not fetch user info.**");
    }
  }
};
