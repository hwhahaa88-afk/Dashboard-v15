const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "serverinfo",
  description: "Display server info | معلومات السيرفر",
  options: [],
  execute: async (ctx) => {
    try {
      return ctx.reply("**🏰 | Server: " + ctx.guild.name + "\n👥 | Members: " + ctx.guild.memberCount + "**");
    } catch (err) {
      return ctx.reply("**❌ | Could not fetch server info.**");
    }
  }
};
