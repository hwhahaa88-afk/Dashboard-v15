const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a user or member from the server | حظر عضو أو أيدي من السيرفر",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      type: 3, // STRING لتثبيت قبول الـ ID أو المنشن لمن خارج السيرفر
      required: true,
      description: "User ID or Mention to ban | أيدي أو منشن الشخص المراد حظره"
    },
    {
      name: "time",
      type: 3,
      required: false,
      description: "Ban duration (e.g. 1d, 7d) | مدة الحظر"
    },
    {
      name: "reason",
      type: 3,
      required: false,
      description: "Reason for ban | سبب الحظر"
    },
    {
      name: "bulk",
      type: 5,
      required: false,
      description: "Delete recent messages | مسح الرسائل"
    }
  ],
  execute: async (ctx) => {
    try {
      const input = ctx.getString("user");
      const reason = ctx.getString("reason") || "No reason provided";
      const time = ctx.getString("time");
      const bulk = ctx.options?.getBoolean("bulk");

      // استخراج الـ ID فقط سواء كتب أيدي أو سحب منشن <@12345>
      const userId = input.replace(/[<@!>]/g, "").trim();

      if (!userId || isNaN(userId)) {
        return ctx.reply("**❌ | Invalid User ID or Mention.**");
      }

      // التحقق من وجود العضو داخل السيرفر لمعرفة صلاحيات حظره
      const member = await ctx.guild.members.fetch(userId).catch(() => null);
      if (member && !member.bannable) {
        return ctx.reply("**❌ | Cannot ban this member (Higher role or missing permissions).**");
      }

      // جلب بيانات الحساب من ديسكورد مباشرة حتى لو كان خارج السيرفر
      const targetUser = await ctx.client.users.fetch(userId).catch(() => null);
      if (!targetUser) {
        return ctx.reply("**❌ | User not found on Discord.**");
      }

      let deleteMessageSeconds = bulk ? 7 * 24 * 60 * 60 : 0;
      let banReason = time ? `${reason} (Duration: ${time})` : reason;

      await ctx.guild.members.ban(targetUser.id, {
        reason: banReason,
        deleteMessageSeconds: deleteMessageSeconds
      });

      return ctx.reply(`**✅ | Successfully banned ${targetUser.tag || targetUser.username} (${targetUser.id})** ${time ? `for ${time}` : ""}`);
    } catch (err) {
      console.error(err);
      return ctx.reply("**❌ | Failed to ban user. Make sure the ID is correct and I have permissions.**");
    }
  }
};
