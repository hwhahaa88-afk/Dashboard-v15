const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const HELP_COLOR = 0x2b2d31;

const HELP_CATEGORIES = {
  moderation: {
    label: '🛡️ Moderation',
    commands: ['ban', 'unban', 'kick', 'timeout', 'untimeout', 'mute', 'unmute', 'mutetext', 'unmutetext', 'clear'],
  },
  voice: {
    label: '🔊 Voice',
    commands: ['vkick', 'vmove', 'mutevoice', 'unmutevoice', 'vmute', 'vunmute'],
  },
  warnings: {
    label: '⚠️ Warnings',
    commands: ['warn', 'warn_remove', 'warnings', 'clearwarns'],
  },
  channels_roles: {
    label: '📂 Channels & Roles',
    commands: ['lock', 'unlock', 'slowmode', 'role', 'role-add', 'role-remove', 'setcolor', 'setnick'],
  },
  utility: {
    label: '🧰 Utility',
    commands: ['embed', 'say', 'botinfo', 'points', 'help'],
  },
};

const HELP_DETAILS = {
  ban: { desc: 'Ban a member from the server, optionally for a limited time.', usage: '/ban user reason bulk time', examples: ['/ban @User', '/ban @User Spamming', '/ban @User Raiding time:7d'] },
  unban: { desc: 'Unban a user using their ID.', usage: '/unban user_id', examples: ['/unban 123456789012345678'] },
  kick: { desc: 'Kick a member from the server.', usage: '/kick user reason', examples: ['/kick @User', '/kick @User Breaking rules'] },
  timeout: { desc: 'Timeout (mute) a member for a specific duration.', usage: '/timeout user duration reason', examples: ['/timeout @User 1h', '/timeout @User 1h Spamming'] },
  untimeout: { desc: 'Remove an active timeout from a member.', usage: '/untimeout user', examples: ['/untimeout @User'] },
  mute: { desc: 'Mute a member for a specific duration (alias of timeout).', usage: '/mute user duration reason', examples: ['/mute @User 30m'] },
  unmute: { desc: 'Remove a mute from a member (alias of untimeout).', usage: '/unmute user', examples: ['/unmute @User'] },
  mutetext: { desc: 'Mute a member from sending messages in all text channels indefinitely.', usage: '/mutetext user reason', examples: ['/mutetext @User', '/mutetext @User Toxicity'] },
  unmutetext: { desc: 'Remove a text mute from a member.', usage: '/unmutetext user', examples: ['/unmutetext @User'] },
  clear: { desc: 'Bulk delete a number of messages from the current channel.', usage: '/clear amount', examples: ['/clear 50'] },
  vkick: { desc: 'Disconnect a member from their current voice channel.', usage: '/vkick user reason', examples: ['/vkick @User'] },
  vmove: { desc: 'Move a member to a different voice channel.', usage: '/vmove user channel', examples: ['/vmove @User #General'] },
  mutevoice: { desc: 'Server-mute a member in voice channels.', usage: '/mutevoice user reason', examples: ['/mutevoice @User'] },
  unmutevoice: { desc: 'Remove a voice mute from a member.', usage: '/unmutevoice user', examples: ['/unmutevoice @User'] },
  vmute: { desc: 'Server-mute a member in voice channels (alias of mutevoice).', usage: '/vmute user reason', examples: ['/vmute @User'] },
  vunmute: { desc: 'Remove a voice mute from a member (alias of unmutevoice).', usage: '/vunmute user', examples: ['/vunmute @User'] },
  warn: { desc: 'Issue a warning to a member.', usage: '/warn user reason', examples: ['/warn @User Spamming'] },
  warn_remove: { desc: 'Remove a specific warning using its ID.', usage: '/warn_remove user warn_id', examples: ['/warn_remove @User abc123'] },
  warnings: { desc: 'View the full warning history of a member.', usage: '/warnings user', examples: ['/warnings @User'] },
  clearwarns: { desc: 'Clear ALL warnings for a member at once.', usage: '/clearwarns user', examples: ['/clearwarns @User'] },
  lock: { desc: 'Lock a channel, preventing @everyone from sending messages.', usage: '/lock channel', examples: ['/lock', '/lock #general'] },
  unlock: { desc: 'Unlock a previously locked channel.', usage: '/unlock channel', examples: ['/unlock', '/unlock #general'] },
  slowmode: { desc: 'Set a slowmode delay for a channel.', usage: '/slowmode seconds channel', examples: ['/slowmode 10'] },
  role: { desc: 'Toggle a role on a member (adds if missing, removes if present).', usage: '/role user role', examples: ['/role @User @VIP'] },
  'role-add': { desc: 'Add a role to a member.', usage: '/role-add user role', examples: ['/role-add @User @VIP'] },
  'role-remove': { desc: 'Remove a role from a member.', usage: '/role-remove user role', examples: ['/role-remove @User @VIP'] },
  setcolor: { desc: 'Change the color of a role.', usage: '/setcolor role color', examples: ['/setcolor @VIP #a78bfa'] },
  setnick: { desc: 'Change the nickname of a member.', usage: '/setnick user nickname', examples: ['/setnick @User Johnny'] },
  embed: { desc: 'Send a custom announcement message to a channel.', usage: '/embed title description channel', examples: ['/embed Welcome "Enjoy your stay!"'] },
  say: { desc: 'Make the bot send a plain message to a channel.', usage: '/say message channel', examples: ['/say Hello everyone!'] },
  botinfo: { desc: 'View bot statistics: servers, users, ping, and uptime.', usage: '/botinfo', examples: ['/botinfo'] },
  points: { desc: 'Manage a member\'s custom points balance.', usage: '/points action user amount', examples: ['/points add @User 10'] },
  help: { desc: 'Show this help menu.', usage: '/help command', examples: ['/help', '/help ban'] },
};

function buildMainHelpEmbed(user) {
  const embed = new EmbedBuilder()
    .setColor(HELP_COLOR)
    .setTitle('Command List')
    .setDescription('Select a category from the menu below to browse commands.\nOr use `/help command:<name>` to view usage & examples for a specific command.');
  for (const cat of Object.values(HELP_CATEGORIES)) {
    embed.addFields({ name: cat.label, value: cat.commands.map((c) => `\`/${c}\``).join(' '), inline: false });
  }
  embed.setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() }).setTimestamp();
  return embed;
}

function buildCategoryEmbed(key, user) {
  const cat = HELP_CATEGORIES[key];
  const embed = new EmbedBuilder()
    .setColor(HELP_COLOR)
    .setTitle(cat.label)
    .setDescription(cat.commands.map((c) => `**/${c}** — ${HELP_DETAILS[c] ? HELP_DETAILS[c].desc : ''}`).join('\n\n'))
    .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() })
    .setTimestamp();
  return embed;
}

function buildCommandDetailEmbed(name, user) {
  const detail = HELP_DETAILS[name];
  if (!detail) return null;
  return new EmbedBuilder()
    .setColor(HELP_COLOR)
    .setTitle(`Command: ${name}`)
    .setDescription(detail.desc)
    .addFields(
      { name: 'Usage', value: `\`${detail.usage}\`` },
      { name: 'Examples', value: detail.examples.map((e) => `\`${e}\``).join('\n') },
    )
    .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() })
    .setTimestamp();
}

function buildHelpSelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('help_menu').setPlaceholder('Select a category').addOptions(
      { label: 'Moderation', value: 'moderation', emoji: '🛡️' },
      { label: 'Voice', value: 'voice', emoji: '🔊' },
      { label: 'Warnings', value: 'warnings', emoji: '⚠️' },
      { label: 'Channels & Roles', value: 'channels_roles', emoji: '📂' },
      { label: 'Utility', value: 'utility', emoji: '🧰' },
    ),
  );
}

module.exports = {
  HELP_COLOR,
  HELP_CATEGORIES,
  HELP_DETAILS,
  buildMainHelpEmbed,
  buildCategoryEmbed,
  buildCommandDetailEmbed,
  buildHelpSelectRow,
};
