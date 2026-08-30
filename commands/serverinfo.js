module.exports = {
  name: "serverinfo",
  description: "Display server info | عرض معلومات السيرفر",
  options: [],
  execute: async (ctx) => {
    try {
      const guild = ctx.guild;
      return ctx.reply("**🏰 | Server: " + guild.name + "\n🆔 | ID: " + guild.id + "\n👥 | Members: " + guild.memberCount + "**");
    } catch (err) {
      return ctx.reply("**❌ | Could not fetch server info.**");
    }
  }
};