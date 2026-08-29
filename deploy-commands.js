const { REST, Routes } = require('discord.js');
const { commands } = require('./commands.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Token or Client ID missing in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 Registering Slash Commands with Discord...');

    const commandsData = commands.map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      options: cmd.options || [],
      default_member_permissions: cmd.defaultMemberPermissions ? cmd.defaultMemberPermissions.toString() : null
    }));

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandsData }
      );
      console.log('✅ Commands successfully registered for Guild:', guildId);
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandsData }
      );
      console.log('✅ Global commands successfully registered!');
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
