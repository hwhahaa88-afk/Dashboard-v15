require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const { commands } = require('./commands');

function buildOption(builder, opt) {
  const setup = (o) => o.setName(opt.name).setDescription((opt.description || opt.name).slice(0, 100)).setRequired(!!opt.required);
  switch (opt.type) {
    case 'user': return builder.addUserOption(setup);
    case 'role': return builder.addRoleOption(setup);
    case 'channel': return builder.addChannelOption(setup);
    case 'voice_channel': return builder.addChannelOption((o) => setup(o).addChannelTypes(ChannelType.GuildVoice));
    case 'integer': return builder.addIntegerOption(setup);
    default: return builder.addStringOption(setup);
  }
}

function buildCommandBody() {
  return commands.map((cmd) => {
    const builder = new SlashCommandBuilder().setName(cmd.name).setDescription(cmd.description.slice(0, 100));
    for (const opt of cmd.options || []) buildOption(builder, opt);
    return builder.toJSON();
  });
}

async function deployCommands() {
  const body = buildCommandBody();
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  if (!clientId) throw new Error('CLIENT_ID is not set');

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log(`✅ Registered ${body.length} slash commands on guild ${guildId} (instant).`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body });
    console.log(`✅ Registered ${body.length} slash commands globally (may take a few minutes to appear).`);
  }
}

if (require.main === module) {
  deployCommands().catch((err) => { console.error('Deploy error:', err); process.exit(1); });
}

module.exports = { deployCommands };
