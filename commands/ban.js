const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a member or user from the server | حظر عضو أو أيدي من السيرفر",
  permission: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      type: 6, // USER type
      required: true,
      description: "User or ID to ban | العضو أو الأيدي المراد حظره"
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
      let userId = null;
      let userObj = null;

      // 1. استخراج المستخدم أو الأيدي من التفاعل بأكثر من طريقة لضمان التوافق
      if (ctx.interaction) {
        userObj = ctx.interaction.options.getUser("user");
        if (userObj) {
          userId = userObj.id;
        } else {
          const rawOption = ctx.interaction.options.get("user");
          if (rawOption && rawOption.value) userId = rawOption.value;
        }
      } else if (typeof ctx.getUserMember === "function") {
        const member = await ctx.getUserMember("user").catch(() => null);
        if (member) {
          userObj = member.user;
          userId = member.id;
        }
      }

      // إذا لم يتوفر بعد، نجرب القراءة المباشرة من الخيارات
      if (!userId && ctx.options) {
        if (typeof ctx.options.getUser === "function") {
          userObj = ctx.options.getUser("user");
          if (userObj) userId = userObj.id;
        }
        if (!userId && typeof ctx.getString === "function") {
          const strVal = ctx.getString("user");
          if (strVal) userId = strVal.replace(/[<@!>]/g, "").trim();
        }
      }

      if (!userId) {
        return ctx.reply("**❌ | User not specified or invalid.**");
      }

      // 2. التحقق من صلاحية رتبة العضو إذا كان موجوداً بالسيرفر
      const member = await ctx.guild.members.fetch(userId).catch(() => null);
      if (member && !member.bannable) {
        return ctx.reply("**❌ | Cannot ban this member (Higher role or missing permissions).**");
      }

      // 3. جلب معلومات الحساب من ديسكورد إن لم تكن متوفرة
      if (!userObj) {
        userObj = await ctx.client.users.fetch(userId).catch(() => null);
      }

      // 4. معالجة خيارات الوقت والسبب والمسح
      const reason = (typeof ctx.getString === "function" ? ctx.getString("reason") : null) || "No reason provided";
      const time = typeof ctx.getString === "function" ? ctx.getString("time") : null;
      let bulk = false;

      if (ctx.interaction) {
        bulk = ctx.interaction.options.getBoolean("bulk") || false;
      } else if (ctx.options && typeof ctx.options.getBoolean === "function") {
        bulk = ctx.options.getBoolean("bulk") || false;
      }

      let deleteMessageSeconds = bulk ? 7 * 24 * 60 * 60 : 0;
      let banReason = time ? `${reason} (Duration: ${time})` : reason;

      // 5. حظر الأيدي مباشرة من السيرفر
      await ctx.guild.members.ban(userId, {
        reason: banReason,
        deleteMessageSeconds: deleteMessageSeconds
      });

      const targetName = userObj ? `${userObj.username} (${userId})` : userId;
      return ctx.reply(`**✅ | Successfully banned ${targetName}** ${time ? `for ${time}` : ""}`);

    } catch (err) {
      console.error("Ban Error:", err);
      return ctx.reply("**❌ | Failed to ban user. Make sure the ID is valid and I have permissions.**");
    }
  }
};
