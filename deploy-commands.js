const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const { commands } = require('./commands.js');
require('dotenv').config();

const OPTION_TYPES = {
  string: 3,
  integer: 4,
  boolean: 5,
  user: 6,
  channel: 7,
  role: 8,
  mentionable: 9,
  number: 10,
  attachment: 11,
  subcommand: 1,
  subcommandgroup: 2
};

function fixOptions(options = []) {
  return options.map(opt => {
    let type = opt.type;
    if (typeof type === 'string') {
      type = OPTION_TYPES[type.toLowerCase().trim()] || 3;
    }
    
    const fixed = { ...opt, type };

    if (fixed.options && Array.isArray(fixed.options)) {
      fixed.options = fixOptions(fixed.options);
    }

    return fixed;
  });
}

const payload = commands.map(cmd => ({
  name: cmd.name.toLowerCase().trim(),
  description: cmd.description,
  options: fixOptions(cmd.options || [])
}));

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Started refreshing ${payload.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: payload }
    );

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
})();
