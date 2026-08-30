module.exports = {
  name: "avatar",
  description: "Display user avatar | عرض صورة العضو",
  options: [
    { name: "user", type: 6, required: false, description: "Select user | اختر العضو" }
  ],
  execute: async (ctx) => {
    try {
      const member = (await ctx.getUserMember("user")) || ctx.member;
      const url = member.user.displayAvatarURL({ dynamic: true, size: 1024 });
      return ctx.reply("**🖼️ | Avatar of " + member.user.username + ":**\n" + url);
    } catch (err) {
      return ctx.reply("**❌ | Could not fetch avatar.**");
    }
  }
};