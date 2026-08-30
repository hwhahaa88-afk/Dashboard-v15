module.exports = {
  name: "user",
  description: "Display user info | عرض معلومات العضو",
  options: [
    { name: "user", type: 6, required: false, description: "Select user | اختر العضو" }
  ],
  execute: async (ctx) => {
    try {
      const member = (await ctx.getUserMember("user")) || ctx.member;
      return ctx.reply("**👤 | User: " + member.user.tag + "\n🆔 | ID: " + member.id + "\n📅 | Joined: <t:" + Math.floor(member.joinedTimestamp / 1000) + ":R>**");
    } catch (err) {
      return ctx.reply("**❌ | Could not fetch user info.**");
    }
  }
};