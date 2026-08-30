const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "clear",
  description: "Clear messages from channel | مسح الرسائل من الشات",
  permission: PermissionFlagsBits.ManageMessages,
  options: [
    { name: "amount", type: 4, required: true, description: "Number of messages (1-100) | عدد الرسائل" }
  ],
  execute: async (ctx) => {
    try {
      const amount = ctx.getInteger("amount");
      if (amount < 1 || amount > 100) {
        const replyMsg = await ctx.reply("**❌ | Amount must be between 1 and 100.**");
        setTimeout(() => {
          if (replyMsg && replyMsg.delete) replyMsg.delete().catch(() => {});
        }, 1500);
        return;
      }

      const deleted = await ctx.channel.bulkDelete(amount, true);
      const count = deleted.size;
      const formattedMessage = "```ansi\n\u001b[32m" + count + "\u001b[0m messages have been deleted.\n```";

      const msg = await ctx.reply(formattedMessage);

      setTimeout(async () => {
        try {
          if (msg && msg.delete) {
            await msg.delete();
          } else if (ctx.interaction) {
            await ctx.interaction.deleteReply().catch(() => {});
          }
        } catch (e) {}
      }, 1500);

    } catch (err) {
      const errorMsg = await ctx.reply("**❌ | An error occurred while clearing messages.**");
      setTimeout(() => {
        if (errorMsg && errorMsg.delete) errorMsg.delete().catch(() => {});
      }, 1500);
    }
  }
};
