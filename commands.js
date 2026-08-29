const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// خدمة توليد المساعدة والتنسيق على طريقة ProBot
const helpService = {
  getUsage(cmd) {
    if (!cmd.options || cmd.options.length === 0) return `/${cmd.name}`;
    return `/${cmd.name} ` + cmd.options.map(o => `[${o.name}]`).join(' ');
  },
  getExamples(cmd, invoker) {
    const userId = invoker.user ? invoker.user.id : invoker.id;
    const userTag = invoker.user ? `@${invoker.user.username}` : `@${invoker.username}`;

    if (cmd.name === 'kick') {
      return `/${cmd.name} ${userTag}\n/${cmd.name} ${userId}`;
    }
    if (cmd.name === 'ban') {
      return `/${cmd.name} ${userTag}\n/${cmd.name} ${userId}`;
    }
    if (cmd.name === 'timeout') {
      return `/${cmd.name} ${userTag} 1h Spamming\n/${cmd.name} ${userId} 1d Rules violation`;
    }
    
    if (!cmd.options || cmd.options.length === 0) return `/${cmd.name}`;
    return `/${cmd.name} ` + cmd.options.map(o => o.name === 'user' ? userTag : 'value').join(' ');
  }
};

const commands = [
  {
    name: 'help',
    description: 'Displays information for a specific command.',
    options: [
      {
        name: 'command',
        description: 'The command to get help for',
        type: 3, // STRING
        required: false
      }
    ],
    async execute(ctx) {
      const inputCmd = ctx.getString('command');
      const invoker = ctx.invoker;

      if (!inputCmd) {
        const embed = new EmbedBuilder()
          .setColor('#2b2d31')
          .setTitle('📖 Command List')
          .setDescription('Use `/help command:[command_name]` to view details of a specific command.')
          .addFields({
            name: 'Available Commands',
            value: commands.map(c => `\`/${c.name}\``).join(', ')
          })
          .setFooter({ 
            text: `Requested by ${invoker.user ? invoker.user.username : invoker.username}`, 
            iconURL: (invoker.user || invoker).displayAvatarURL() 
          })
          .setTimestamp();

        return ctx.reply({ embeds: [embed], ephemeral: true });
      }

      const cleanName = inputCmd.toLowerCase().trim().replace(/^\//, '');
      const targetCmd = commands.find(c => c.name.toLowerCase() === cleanName);

      if (!targetCmd) {
        return ctx.reply({ content: `❌ الأمر \`${cleanName}\` غير موجود.`, ephemeral: true });
      }

      const usage = helpService.getUsage(targetCmd);
      const examples = helpService.getExamples(targetCmd, invoker);

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`Command: ${targetCmd.name}`)
        .setDescription(`${targetCmd.description}\n\n**Usage:**\n${usage}\n\n**Examples:**\n${examples}`)
        .setFooter({ 
          text: `Requested by ${(invoker.user || invoker).username}`, 
          iconURL: (invoker.user || invoker).displayAvatarURL() 
        })
        .setTimestamp();

      return ctx.reply({ embeds: [embed], ephemeral: true });
    }
  },
  {
    name: 'kick',
    description: 'Kicks a member.',
    options: [
      { name: 'user', description: 'The user to kick', type: 6, required: true },
      { name: 'reason', description: 'The reason for kick', type: 3, required: false }
    ],
    async execute(ctx) {
      const target = await ctx.getUserMember('user');
      const reason = ctx.getString('reason') || 'No reason provided';
      if (!target) return ctx.reply({ content: '❌ Member not found.', ephemeral: true });

      try {
        await target.kick(reason);
        return ctx.reply({ content: `✅ Successfully kicked ${target.user.tag}. Reason: ${reason}` });
      } catch (e) {
        return ctx.reply({ content: '❌ Cannot kick this user.', ephemeral: true });
      }
    }
  },
  {
    name: 'ban',
    description: 'Bans a member from the server.',
    options: [
      { name: 'user', description: 'The user to ban', type: 6, required: true },
      { name: 'reason', description: 'The reason for ban', type: 3, required: false }
    ],
    async execute(ctx) {
      const target = await ctx.getUserMember('user');
      const reason = ctx.getString('reason') || 'No reason provided';
      if (!target) return ctx.reply({ content: '❌ Member not found.', ephemeral: true });

      try {
        await target.ban({ reason });
        return ctx.reply({ content: `✅ Successfully banned ${target.user.tag}. Reason: ${reason}` });
      } catch (e) {
        return ctx.reply({ content: '❌ Cannot ban this user.', ephemeral: true });
      }
    }
  },
  {
    name: 'timeout',
    description: 'Timeout (mute) a member for a specific duration.',
    options: [
      { name: 'user', description: 'The user to timeout', type: 6, required: true },
      { name: 'duration', description: 'Duration (e.g. 10m, 1h, 1d)', type: 3, required: true },
      { name: 'reason', description: 'Reason for timeout', type: 3, required: false }
    ],
    async execute(ctx) {
      const target = await ctx.getUserMember('user');
      const durationStr = ctx.getString('duration');
      const reason = ctx.getString('reason') || 'No reason provided';

      if (!target) return ctx.reply({ content: '❌ Member not found.', ephemeral: true });

      let ms = 0;
      if (durationStr.endsWith('m')) ms = parseInt(durationStr) * 60 * 1000;
      else if (durationStr.endsWith('h')) ms = parseInt(durationStr) * 3600 * 1000;
      else if (durationStr.endsWith('d')) ms = parseInt(durationStr) * 86400 * 1000;
      else ms = parseInt(durationStr) * 1000;

      if (isNaN(ms) || ms <= 0) return ctx.reply({ content: '❌ Invalid duration format.', ephemeral: true });

      try {
        await target.timeout(ms, reason);
        return ctx.reply({ content: `✅ Timed out ${target.user.tag} for \`${durationStr}\`. Reason: ${reason}` });
      } catch (e) {
        return ctx.reply({ content: '❌ Cannot timeout this user.', ephemeral: true });
      }
    }
  }
];

module.exports = { commands };
