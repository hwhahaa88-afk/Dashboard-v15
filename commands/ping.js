const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ping",
  description: "Check bot latency | فحص بنج البوت",
  options: [],
  execute: async (ctx) => {
    return ctx.reply("**🏓 | Pong! Latency: " + ctx.client.ws.ping + "ms**");
  }
};
