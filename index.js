require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { commands } = require('./commands');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`🤖 البوت شغال وجاهز! الحساب: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = commands.find(c => c.name === interaction.commandName);
    if (!cmd) return;

    // تجهيز سياق التفاعل للعمل مع الكود
    const ctx = {
      isSlash: true,
      guild: interaction.guild,
      channel: interaction.channel,
      invoker: interaction.member || interaction.user,
      raw: interaction,
      reply: (content) => {
        if (typeof content === 'string') {
          return interaction.reply({ content, ephemeral: false }).catch(() => null);
        }
        return interaction.reply({ ...content, ephemeral: false }).catch(() => null);
      },
      getUserMember: async (optName) => {
        return interaction.options.getMember(optName) || await interaction.guild.members.fetch(interaction.options.getUser(optName)?.id).catch(() => null);
      },
      getString: (optName) => interaction.options.getString(optName),
      getInteger: (optName) => interaction.options.getInteger(optName),
      getChannel: (optName) => interaction.options.getChannel(optName),
      getRole: (optName) => interaction.options.getRole(optName)
    };

    try {
      await cmd.execute(ctx);
    } catch (err) {
      console.error(err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.', ephemeral: false }).catch(() => null);
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
