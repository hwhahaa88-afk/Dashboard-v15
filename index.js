require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);
    if ('name' in command && 'execute' in command) {
      client.commands.set(command.name, command);
    }
  }
}

client.once('ready', () => {
  console.log(`🤖 البوت شغال وجاهز! ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // تأكيد استلام التفاعل فورياً لإلغاء حالة التفكير فوراً
  let isDeferred = false;
  try {
    await interaction.deferReply().catch(() => null);
    isDeferred = true;
  } catch (e) {}

  const ctx = {
    isSlash: true,
    guild: interaction.guild,
    channel: interaction.channel,
    invoker: interaction.user,
    member: interaction.member,
    raw: interaction,
    getInteger: (name) => interaction.options.getInteger(name),
    getUser: (name) => interaction.options.getUser(name),
    getMember: (name) => interaction.options.getMember(name),
    getString: (name) => interaction.options.getString(name),
    reply: async (content) => {
      let payload = typeof content === 'string' ? { content } : { ...content };

      // IMPORTANT: do not swallow errors here. If editReply/followUp fails
      // silently, the interaction never resolves and Discord shows
      // "is thinking..." forever with zero visible error. Re-throwing lets
      // the outer command try/catch (and index.js's hardened fallback)
      // actually handle it and guarantee a response.
      if (interaction.replied) {
        return await interaction.followUp(payload);
      } else {
        return await interaction.editReply(payload);
      }
    }
  };

  try {
    await command.execute(ctx);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    await interaction.editReply({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر!' }).catch(() => null);
  }
} catch (topLevelError) {
    console.error('🔴 Top-level interactionCreate error:', topLevelError);
    try {
      const payload = { content: '❌ حدث خطأ غير متوقع أثناء تنفيذ هذا الأمر!' };
      if (interaction.replied) await interaction.followUp(payload);
      else if (interaction.deferred) await interaction.editReply(payload);
      else await interaction.reply(payload);
    } catch (finalError) {
      console.error('🔴 Failed to send top-level fallback reply:', finalError);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
