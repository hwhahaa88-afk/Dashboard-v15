module.exports = {
  name: "help",
  description: "Display command list | عرض قائمة الأوامر",
  options: [],
  execute: async (ctx) => {
    return ctx.reply("**📌 | Commands List:**\n/ban, /kick, /clear, /mute, /unmute, /timeout, /unban, /warn, /ping, /user, /serverinfo, /avatar, /voicemove, /voicekick, /voicemute, /voiceunmute, /voicedeaf");
  }
};