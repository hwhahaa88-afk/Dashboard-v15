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
      if (amount < 1 || amount > 100) return ctx.reply("**❌ | Amount must be between 1 and 100.**");
      await ctx.channel.bulkDelete(amount, true);
      return ctx.reply("**✅ | Cleared " + amount + " messages successfully!**");
    } catch (err) {
      return ctx.reply("**❌ | An error occurred while clearing messages.**");
    }
  }
};