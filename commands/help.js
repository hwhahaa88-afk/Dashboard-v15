const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "help",
  description: "Display command list | قائمة الأوامر",
  options: [],
  execute: async (ctx) => {
    return ctx.reply("**📌 | Commands:** ban, kick, clear, mute, unmute, timeout, unban, warn, ping, user, serverinfo, avatar, voicemove, voicekick, voicemute, voiceunmute, voicedeaf");
  }
};
