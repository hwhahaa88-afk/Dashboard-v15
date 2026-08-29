const { EmbedBuilder } = require('discord.js');

const commands = [
  {
    name: 'help',
    description: 'عرض معلومات أمر معين أو قائمة الأوامر المتاحة',
    options: [
      {
        name: 'command',
        description: 'اسم الأمر المراد استعراض تفاصيله',
        type: 3, // STRING
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

      const targetCmd = commands.find(c => c.name === cmdName.toLowerCase().replace('/', ''));
      if (!targetCmd) {
        return ctx.reply({ content: `❌ الأمر \`/${cmdName}\` غير موجود.`, ephemeral: true });
      }

      let usage = `\`/${targetCmd.name}\``;
      let examples = `\`/${targetCmd.name}\``;

      if (targetCmd.name === 'timeout') {
        usage = '`/timeout user:<@member> duration:<10m/2h/1d> reason:<text>`';
        examples = '`/timeout user:@User duration:1h reason:Spamming`';
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
  }
];

module.exports = { commands };
