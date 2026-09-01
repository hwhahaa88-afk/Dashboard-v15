require('dotenv').config();
const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('name' in command && 'execute' in command) {
      commands.push(command);
    }
  }
}

if (fs.existsSync(path.join(__dirname, 'commands.js'))) {
  const mainModule = require('./commands');
  const mainCommands = mainModule.commands || mainModule;
  if (Array.isArray(mainCommands)) {
    for (const cmd of mainCommands) {
      if (cmd && cmd.name && !commands.some(c => c.name === cmd.name)) {
        commands.push(cmd);
      }
    }
  }
}

// تحويل BigInt إلى String
const cleanedCommands = JSON.parse(
  JSON.stringify(commands, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  )
);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log(`Started refreshing ${cleanedCommands.length} application (/) commands.`);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: cleanedCommands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
