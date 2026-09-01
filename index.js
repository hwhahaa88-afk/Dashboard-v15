require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

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
      
      try {
        if (interaction.replied) {
          return await interaction.followUp(payload);
        } else {
          return await interaction.editReply(payload);
        }
      } catch (err) {
        console.error('Reply execution error:', err);
      }
    }
  };

  try {
    await command.execute(ctx);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    await interaction.editReply({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر!' }).catch(() => null);
  }
});

client.login(process.env.DISCORD_TOKEN);
