module.exports = {
  name: "ping",
  description: "Check bot latency | فحص بنج البوت",
  options: [],
  execute: async (ctx) => {
    return ctx.reply("**🏓 | Pong! Bot latency: " + ctx.client.ws.ping + "ms**");
  }
};