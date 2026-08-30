const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "clear",
  description: "Clear messages | مسح الرسائل",
  permission: PermissionFlagsBits.ManageMessages,
  options: [
    {
        "name": "amount",
        "type": 4,
        "required": true,
        "description": "Number of messages (1-100)"
    }
],
  execute: async (ctx) => {
    try {
      const amount = ctx.getInteger("amount");
      if (amount < 1 || amount > 100) return ctx.reply("**❌ | Amount must be between 1 and 100.**");
      await ctx.channel.bulkDelete(amount, true);
      return ctx.reply("**✅ | Cleared " + amount + " messages!**");
    } catch (err) {
      return ctx.reply("**❌ | Failed to clear messages.**");
    }
  }
};
