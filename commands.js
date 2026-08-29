const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
  {
    name: 'help',
    description: 'عرض معلومات أمر معين أو قائمة الأوامر المتاحة',
    options: [
      {
        name: 'command',
        description: 'اسم الأمر المراد استعراض تفاصيله',
        type: 3,
        required: false
      }
    ],
    async execute(ctx) {
      const cmdName = ctx.getString('command');
      const user = ctx.invoker.user || ctx.invoker;

      if (!cmdName) {
        const embed = new EmbedBuilder()
          .setColor('#2b2d31')
          .setTitle('📖 قائمة أوامر البوت')
          .setDescription('استخدم `/help command:[اسم_الأمر]` لمعرفة كيفية استخدام أمر معين بالتفصيل.')
          .addFields({
            name: '⚡ الأوامر المتاحة',
            value: commands.map(c => `\`/${c.name}\``).join(', ')
          })
          .setFooter({ 
            text: `Requested by ${user.username}`, 
            iconURL: user.displayAvatarURL() 
          })
          .setTimestamp();

        return ctx.reply({ embeds: [embed], ephemeral: true });
      }

      const cleanName = cmdName.toLowerCase().replace('/', '');
      const targetCmd = commands.find(c => c.name === cleanName);

      if (!targetCmd) {
        return ctx.reply({ content: `❌ الأمر \`/${cleanName}\` غير موجود.`, ephemeral: true });
      }

      let usage = `\`/${targetCmd.name}\``;
      let examples = `\`/${targetCmd.name}\``;

      if (targetCmd.name === 'timeout') {
        usage = '`/timeout user:<@member> duration:<10m/2h/1d> reason:<text>`';
        examples = '`/timeout user:@User duration:1h reason:Spamming`';
      } else if (targetCmd.name === 'ban') {
        usage = '`/ban user:<@member> reason:<text>`';
        examples = '`/ban user:@User reason:Breaking rules`';
      } else if (targetCmd.name === 'kick') {
        usage = '`/kick user:<@member> reason:<text>`';
        examples = '`/kick user:@User reason:Inappropriate behavior`';
      } else if (targetCmd.options && targetCmd.options.length > 0) {
        usage = `\`/${targetCmd.name} ` + targetCmd.options.map(o => `${o.name}:${o.required ? '<value>' : '[value]'}`).join(' ') + '`';
      }

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`📖 Command: /${targetCmd.name}`)
        .setDescription(`${targetCmd.description}\n\n**Usage**\n${usage}\n\n**Examples**\n${examples}`)
        .setFooter({ 
          text: `Requested by ${user.username}`, 
          iconURL: user.displayAvatarURL() 
        })
        .setTimestamp();

      return ctx.reply({ embeds: [embed], ephemeral: true });
    }
  },
  {
    name: 'ban',
    description: 'حظر عضو من السيرفر (Ban)',
    options: [
      { name: 'user', description: 'العضو المراد حظره', type: 6, required: true },
      { name: 'reason', description: 'سبب الحظر', type: 3, required: false }
    ],
    async execute(ctx) {
      const target = await ctx.getUserMember('user');
      const reason = ctx.getString('reason') || 'بدون سبب';
      if (!target) return ctx.reply({ content: '❌ لم يتم العثور على العضو.', ephemeral: true });

      try {
        await target.ban({ reason });
        return ctx.reply({ content: `✅ تم حظر ${target.user.tag} بنجاح. السبب: ${reason}` });
      } catch (e) {
        return ctx.reply({ content: '❌ متعذر حظر هذا العضو (تحقق من الصلاحيات).', ephemeral: true });
      }
    }
  },
  {
    name: 'kick',
    description: 'طرد عضو من السيرفر (Kick)',
    options: [
      { name: 'user', description: 'العضو المراد طرده', type: 6, required: true },
      { name: 'reason', description: 'سبب الطرد', type: 3, required: false }
    ],
    async execute(ctx) {
      const target = await ctx.getUserMember('user');
      const reason = ctx.getString('reason') || 'بدون سبب';
      if (!target) return ctx.reply({ content: '❌ لم يتم العثور على العضو.', ephemeral: true });

      try {
        await target.kick(reason);
        return ctx.reply({ content: `✅ تم طرد ${target.user.tag} بنجاح. السبب: ${reason}` });
      } catch (e) {
        return ctx.reply({ content: '❌ متعذر طرد هذا العضو (تحقق من الصلاحيات).', ephemeral: true });
      }
    }
  },
  {
    name: 'timeout',
    description: 'إسكات عضو لفترة محددة (Mute/Timeout)',
    options: [
      { name: 'user', description: 'العضو المراد إسكاه', type: 6, required: true },
      { name: 'duration', description: 'المدة (مثال: 10m, 1h, 1d)', type: 3, required: true },
      { name: 'reason', description: 'سبب الإسكات', type: 3, required: false }
    ],
    async execute(ctx) {
      const target = await ctx.getUserMember('user');
      const durationStr = ctx.getString('duration');
      const reason = ctx.getString('reason') || 'بدون سبب';

      if (!target) return ctx.reply({ content: '❌ لم يتم العثور على العضو.', ephemeral: true });

      let ms = 0;
      if (durationStr.endsWith('m')) ms = parseInt(durationStr) * 60 * 1000;
      else if (durationStr.endsWith('h')) ms = parseInt(durationStr) * 3600 * 1000;
      else if (durationStr.endsWith('d')) ms = parseInt(durationStr) * 86400 * 1000;
      else ms = parseInt(durationStr) * 1000;

      if (isNaN(ms) || ms <= 0) return ctx.reply({ content: '❌ صيغة الوقت غير صحيحة. استخدم 10m أو 1h أو 1d.', ephemeral: true });

      try {
        await target.timeout(ms, reason);
        return ctx.reply({ content: `✅ تم إسكات ${target.user.tag} لمدة \`${durationStr}\`. السبب: ${reason}` });
      } catch (e) {
        return ctx.reply({ content: '❌ متعذر إسكات هذا العضو.', ephemeral: true });
      }
    }
  }
];

module.exports = { commands };
