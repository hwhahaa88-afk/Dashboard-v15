const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "avatar",
  description: "Display user avatar | صورة العضو",
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
      const url = member.user.displayAvatarURL({ dynamic: true, size: 1024 });
      return ctx.reply("**🖼️ | Avatar:**\n" + url);
    } catch (err) {
      return ctx.reply("**❌ | Could not fetch avatar.**");
    } 
  }
};
