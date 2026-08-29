const { PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getWarnings, addWarning, removeWarning, clearWarnings, getPoints, addPoints } = require('./database');

function ok(text) { return text; }
function fail(text) { return text; }

function resolveChannelMention(guild, raw) {
  const id = raw.replace(/[<#>]/g, '');
  return guild.channels.cache.get(id) || null;
}

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

async function ensureMutedRole(guild) {
  let role = guild.roles.cache.find((r) => r.name === 'Muted-Text');
  if (!role) {
    role = await guild.roles.create({ name: 'Muted-Text', color: 'Grey', reason: 'Auto-created mute role' });
    for (const [, channel] of guild.channels.cache) {
      try { await channel.permissionOverwrites.edit(role, { SendMessages: false, AddReactions: false }); } catch {}
    }
  }
  return role;
}

function parseDuration(input) {
  if (!input) return null;
  const match = String(input).match(/^(\d+)(s|m|h|d)$/i);
  if (!match) {
    const n = parseInt(input, 10);
    return Number.isNaN(n) ? null : n * 60 * 1000;
  }
  const value = parseInt(match[1], 10);
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2].toLowerCase()];
  return value * mult;
}

const tempBanTimers = new Map();
function scheduleTempUnban(guild, userId, ms) {
  const key = `${guild.id}-${userId}`;
  if (tempBanTimers.has(key)) clearTimeout(tempBanTimers.get(key));
  const timer = setTimeout(async () => {
    try { await guild.bans.remove(userId, 'Temporary ban expired'); } catch {}
    tempBanTimers.delete(key);
  }, ms);
  tempBanTimers.set(key, timer);
}

// ---------------------------------------------------------------------------
// /help data — ProBot-style embed content (categories + per-command details)
// ---------------------------------------------------------------------------
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
  ban: { desc: 'Ban a member from the server, optionally for a limited time.', usage: '/ban user:<@member> reason:<text> bulk:<0-7> time:<1d/12h>', examples: ['/ban user:@John reason:Spamming', '/ban user:@John reason:Raiding time:7d'] },
  unban: { desc: 'Unban a user using their ID.', usage: '/unban user_id:<id>', examples: ['/unban user_id:123456789012345678'] },
  kick: { desc: 'Kick a member from the server.', usage: '/kick user:<@member> reason:<text>', examples: ['/kick user:@John reason:Breaking rules'] },
  timeout: { desc: 'Timeout (mute) a member for a specific duration.', usage: '/timeout user:<@member> duration:<10m/2h/1d> reason:<text>', examples: ['/timeout user:@John duration:1h reason:Spamming'] },
  untimeout: { desc: 'Remove an active timeout from a member.', usage: '/untimeout user:<@member>', examples: ['/untimeout user:@John'] },
  mute: { desc: 'Mute a member for a specific duration (alias of timeout).', usage: '/mute user:<@member> duration:<10m/2h/1d> reason:<text>', examples: ['/mute user:@John duration:30m reason:Spamming'] },
  unmute: { desc: 'Remove a mute from a member (alias of untimeout).', usage: '/unmute user:<@member>', examples: ['/unmute user:@John'] },
  mutetext: { desc: 'Mute a member from sending messages in all text channels indefinitely.', usage: '/mutetext user:<@member> reason:<text>', examples: ['/mutetext user:@John reason:Toxicity'] },
  unmutetext: { desc: 'Remove a text mute from a member.', usage: '/unmutetext user:<@member>', examples: ['/unmutetext user:@John'] },
  clear: { desc: 'Bulk delete a number of messages from the current channel.', usage: '/clear amount:<1-100>', examples: ['/clear amount:50'] },
  vkick: { desc: 'Disconnect a member from their current voice channel.', usage: '/vkick user:<@member> reason:<text>', examples: ['/vkick user:@John reason:AFK'] },
  vmove: { desc: 'Move a member to a different voice channel.', usage: '/vmove user:<@member> channel:<#voice-channel>', examples: ['/vmove user:@John channel:#General'] },
  mutevoice: { desc: 'Server-mute a member in voice channels.', usage: '/mutevoice user:<@member> reason:<text>', examples: ['/mutevoice user:@John'] },
  unmutevoice: { desc: 'Remove a voice mute from a member.', usage: '/unmutevoice user:<@member>', examples: ['/unmutevoice user:@John'] },
  vmute: { desc: 'Server-mute a member in voice channels (alias of mutevoice).', usage: '/vmute user:<@member> reason:<text>', examples: ['/vmute user:@John'] },
  vunmute: { desc: 'Remove a voice mute from a member (alias of unmutevoice).', usage: '/vunmute user:<@member>', examples: ['/vunmute user:@John'] },
  warn: { desc: 'Issue a warning to a member.', usage: '/warn user:<@member> reason:<text>', examples: ['/warn user:@John reason:Spamming'] },
  warn_remove: { desc: 'Remove a specific warning using its ID.', usage: '/warn_remove user:<@member> warn_id:<id>', examples: ['/warn_remove user:@John warn_id:abc123'] },
  warnings: { desc: 'View the full warning history of a member.', usage: '/warnings user:<@member>', examples: ['/warnings user:@John'] },
  clearwarns: { desc: 'Clear ALL warnings for a member at once.', usage: '/clearwarns user:<@member>', examples: ['/clearwarns user:@John'] },
  lock: { desc: 'Lock a channel, preventing @everyone from sending messages.', usage: '/lock channel:<#channel>', examples: ['/lock', '/lock channel:#general'] },
  unlock: { desc: 'Unlock a previously locked channel.', usage: '/unlock channel:<#channel>', examples: ['/unlock', '/unlock channel:#general'] },
  slowmode: { desc: 'Set a slowmode delay for a channel.', usage: '/slowmode seconds:<0-21600> channel:<#channel>', examples: ['/slowmode seconds:10'] },
  role: { desc: 'Toggle a role on a member (adds if missing, removes if present).', usage: '/role user:<@member> role:<@role>', examples: ['/role user:@John role:@VIP'] },
  'role-add': { desc: 'Add a role to a member.', usage: '/role-add user:<@member> role:<@role>', examples: ['/role-add user:@John role:@VIP'] },
  'role-remove': { desc: 'Remove a role from a member.', usage: '/role-remove user:<@member> role:<@role>', examples: ['/role-remove user:@John role:@VIP'] },
  setcolor: { desc: 'Change the color of a role.', usage: '/setcolor role:<@role> color:<#hex>', examples: ['/setcolor role:@VIP color:#a78bfa'] },
  setnick: { desc: 'Change the nickname of a member.', usage: '/setnick user:<@member> nickname:<text>', examples: ['/setnick user:@John nickname:Johnny'] },
  embed: { desc: 'Send a custom announcement message to a channel.', usage: '/embed title:<text> description:<text> channel:<#channel>', examples: ['/embed title:Welcome description:Enjoy your stay!'] },
  say: { desc: 'Make the bot send a plain message to a channel.', usage: '/say message:<text> channel:<#channel>', examples: ['/say message:Hello everyone!'] },
  botinfo: { desc: 'View bot statistics: servers, users, ping, and uptime.', usage: '/botinfo', examples: ['/botinfo'] },
  points: { desc: 'Manage a member\'s custom points balance.', usage: '/points action:<add/remove/show> user:<@member> amount:<number>', examples: ['/points action:add user:@John amount:10'] },
  help: { desc: 'Show this help menu.', usage: '/help command:<name>', examples: ['/help', '/help command:ban'] },
};

function buildMainHelpEmbed(user) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('⚡ OS System — Command List')
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
    .setColor(0x5865f2)
    .setTitle(`⚡ OS System — ${cat.label}`)
    .setDescription(cat.commands.map((c) => `**/${c}** — ${HELP_DETAILS[c] ? HELP_DETAILS[c].desc : ''}`).join('\n\n'))
    .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() })
    .setTimestamp();
  return embed;
}

function buildCommandDetailEmbed(name, user) {
  const detail = HELP_DETAILS[name];
  if (!detail) return null;
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📖 Command: /${name}`)
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

const commands = [
  {
    name: 'ban', description: 'Ban a member from the server | حظر عضو من السيرفر', permission: PermissionFlagsBits.BanMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to ban' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason for the ban' },
      { name: 'bulk', type: 'integer', required: false, description: 'Delete messages from the last X days (0-7)' },
      { name: 'time', type: 'string', required: false, description: 'Temporary ban duration, e.g. 1d, 12h (leave empty for permanent)' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const reason = ctx.getString('reason') || 'No reason provided';
      let bulk = ctx.getInteger('bulk') || 0;
      const time = ctx.getString('time');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!member.bannable) return ctx.reply(fail('❌ I cannot ban this member (higher role than mine).'));
      if (bulk < 0) bulk = 0;
      if (bulk > 7) bulk = 7;
      const ms = time ? parseDuration(time) : null;
      if (time && (!ms || ms <= 0)) return ctx.reply(fail('❌ Invalid duration. Example: 1d, 12h, 30m'));
      await member.ban({ reason, deleteMessageSeconds: bulk * 86400 });
      if (ms) scheduleTempUnban(ctx.guild, member.id, ms);
      const suffix = ms ? ` for ${time}` : '';
      return ctx.reply(ok(`🔨 ${member.user.tag} has been banned${suffix}!\n📝 Reason: ${reason}`));
    },
  },
  {
    name: 'unban', description: 'Unban a user by ID | فك حظر عضو عبر الآيدي', permission: PermissionFlagsBits.BanMembers,
    options: [{ name: 'user_id', type: 'string', required: true, description: 'The ID of the user to unban' }],
    execute: async (ctx) => {
      const id = ctx.getString('user_id');
      if (!id) return ctx.reply(fail('❌ You must provide a user ID.'));
      try {
        await ctx.guild.bans.remove(id, 'Unbanned via command');
        return ctx.reply(ok(`✅ User ${id} has been unbanned!`));
      } catch { return ctx.reply(fail('❌ No ban found for this ID.')); }
    },
  },
  {
    name: 'kick', description: 'Kick a member from the server | طرد عضو من السيرفر', permission: PermissionFlagsBits.KickMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to kick' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason for the kick' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const reason = ctx.getString('reason') || 'No reason provided';
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!member.kickable) return ctx.reply(fail('❌ I cannot kick this member.'));
      await member.kick(reason);
      return ctx.reply(ok(`👢 ${member.user.tag} has been kicked!\n📝 Reason: ${reason}`));
    },
  },
  {
    name: 'vkick', description: 'Disconnect a member from their voice channel | طرد عضو من الروم الصوتي', permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to disconnect' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!member.voice.channel) return ctx.reply(fail('❌ Member is not in a voice channel.'));
      await member.voice.disconnect(ctx.getString('reason') || 'Voice kick via command');
      return ctx.reply(ok(`🔊 ${member.user.tag} has been kicked from the voice channel!`));
    },
  },
  {
    name: 'vmove', description: 'Move a member to another voice channel | نقل عضو لروم صوتي آخر', permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to move' },
      { name: 'channel', type: 'voice_channel', required: true, description: 'Target voice channel' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const channel = ctx.getChannel('channel');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!member.voice.channel) return ctx.reply(fail('❌ Member is not in a voice channel.'));
      if (!channel || channel.type !== ChannelType.GuildVoice) return ctx.reply(fail('❌ You must specify a valid voice channel.'));
      await member.voice.setChannel(channel);
      return ctx.reply(ok(`🔀 ${member.user.tag} has been moved to #${channel.name}!`));
    },
  },
  {
    name: 'timeout', description: 'Timeout a member | إسكات مؤقت لعضو', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to timeout' },
      { name: 'duration', type: 'string', required: true, description: 'Duration, e.g. 10m, 2h, 1d' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const durationRaw = ctx.getString('duration');
      const reason = ctx.getString('reason') || 'No reason provided';
      const ms = parseDuration(durationRaw);
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!ms || ms <= 0 || ms > 28 * 86400000) return ctx.reply(fail('❌ Invalid duration (max 28 days). Example: 10m, 2h, 1d'));
      await member.timeout(ms, reason);
      return ctx.reply(ok(`⏱️ ${member.user.tag} has been timed out for ${durationRaw}!\n📝 Reason: ${reason}`));
    },
  },
  {
    name: 'untimeout', description: 'Remove a timeout from a member | إلغاء الإسكات المؤقت', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      await member.timeout(null);
      return ctx.reply(ok(`✅ ${member.user.tag}'s timeout has been removed!`));
    },
  },
  {
    name: 'mute', description: 'Mute a member for a duration (alias of timeout) | كتم عضو لمدة محددة', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to mute' },
      { name: 'duration', type: 'string', required: true, description: 'Duration, e.g. 10m, 2h, 1d' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const durationRaw = ctx.getString('duration');
      const reason = ctx.getString('reason') || 'No reason provided';
      const ms = parseDuration(durationRaw);
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!ms || ms <= 0 || ms > 28 * 86400000) return ctx.reply(fail('❌ Invalid duration (max 28 days). Example: 10m, 2h, 1d'));
      await member.timeout(ms, reason);
      return ctx.reply(ok(`🔇 ${member.user.tag} has been muted for ${durationRaw}!\n📝 Reason: ${reason}`));
    },
  },
  {
    name: 'unmute', description: 'Remove a mute from a member (alias of untimeout) | إلغاء الكتم', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      await member.timeout(null);
      return ctx.reply(ok(`🔊 ${member.user.tag} has been unmuted!`));
    },
  },
  {
    name: 'mutetext', description: 'Mute a member from all text channels | كتم عضو عن الكتابة', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const reason = ctx.getString('reason') || 'No reason provided';
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      const role = await ensureMutedRole(ctx.guild);
      await member.roles.add(role, reason);
      return ctx.reply(ok(`🔇 ${member.user.tag} has been muted from text!\n📝 Reason: ${reason}`));
    },
  },
  {
    name: 'unmutetext', description: 'Unmute a member from text channels | إلغاء كتم الكتابة', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      const role = await ensureMutedRole(ctx.guild);
      await member.roles.remove(role);
      return ctx.reply(ok(`🔊 ${member.user.tag} has been unmuted from text!`));
    },
  },
  {
    name: 'mutevoice', description: 'Server-mute a member in voice | كتم صوت عضو', permission: PermissionFlagsBits.MuteMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!member.voice.channel) return ctx.reply(fail('❌ Member is not in a voice channel.'));
      await member.voice.setMute(true, ctx.getString('reason') || 'Voice mute via command');
      return ctx.reply(ok(`🔇 ${member.user.tag} has been muted from voice!`));
    },
  },
  {
    name: 'unmutevoice', description: 'Remove voice mute from a member | إلغاء كتم صوت عضو', permission: PermissionFlagsBits.MuteMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      await member.voice.setMute(false, 'Voice unmute via command');
      return ctx.reply(ok(`🔊 ${member.user.tag} has been unmuted from voice!`));
    },
  },
  {
    name: 'vmute', description: 'Server-mute a member in voice (alias of mutevoice) | كتم صوتي', permission: PermissionFlagsBits.MuteMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!member.voice.channel) return ctx.reply(fail('❌ Member is not in a voice channel.'));
      await member.voice.setMute(true, ctx.getString('reason') || 'Voice mute via command');
      return ctx.reply(ok(`🔇 ${member.user.tag} has been muted from voice!`));
    },
  },
  {
    name: 'vunmute', description: 'Remove voice mute from a member (alias of unmutevoice) | إلغاء الكتم الصوتي', permission: PermissionFlagsBits.MuteMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      await member.voice.setMute(false, 'Voice unmute via command');
      return ctx.reply(ok(`🔊 ${member.user.tag} has been unmuted from voice!`));
    },
  },
  {
    name: 'warn', description: 'Warn a member | إضافة تحذير لعضو', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'reason', type: 'string', required: true, consumeRest: true, description: 'Reason for the warning' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const reason = ctx.getString('reason');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!reason) return ctx.reply(fail('❌ You must provide a reason.'));
      const warning = addWarning(ctx.guild.id, member.id, reason, ctx.invoker.id);
      return ctx.reply(ok(`⚠️ ${member.user.tag} has been warned!\n📝 Reason: ${reason}\n🆔 Warn ID: ${warning.id}`));
    },
  },
  {
    name: 'warn_remove', description: 'Remove a specific warning | حذف تحذير معين', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'warn_id', type: 'string', required: true, description: 'The warning ID' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const warnId = ctx.getString('warn_id');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      const removed = removeWarning(ctx.guild.id, member.id, warnId);
      if (!removed) return ctx.reply(fail('❌ No warning found with this ID.'));
      return ctx.reply(ok(`✅ Warning ${warnId} has been removed from ${member.user.tag}!`));
    },
  },
  {
    name: 'warnings', description: 'View a member\'s warning history | عرض تحذيرات عضو', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      const warns = getWarnings(ctx.guild.id, member.id);
      if (!warns.length) return ctx.reply(ok(`✅ ${member.user.tag} has no warnings.`));
      const list = warns.map((w, i) => `${i + 1}. ${w.id} - ${w.reason} (by <@${w.moderator_id}>)`).join('\n');
      return ctx.reply(ok(`⚠️ Warnings — ${member.user.tag}\n${list}`));
    },
  },
  {
    name: 'clearwarns', description: 'Clear all warnings for a member | حذف كل تحذيرات عضو', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      const count = clearWarnings(ctx.guild.id, member.id);
      if (!count) return ctx.reply(ok(`✅ ${member.user.tag} had no warnings to clear.`));
      return ctx.reply(ok(`🧹 Cleared ${count} warning(s) for ${member.user.tag}!`));
    },
  },
  {
    name: 'clear', description: 'Bulk delete messages (1-100) | حذف عدد من الرسائل', permission: PermissionFlagsBits.ManageMessages,
    options: [{ name: 'amount', type: 'integer', required: true, description: 'Number of messages to delete (1-100) | عدد الرسائل' }],
    execute: async (ctx) => {
      let amount = ctx.getInteger('amount');
      if (!amount || amount < 1) return ctx.reply(fail('❌ Enter a number between 1 and 100.'));
      if (amount > 100) amount = 100;
      const deleted = await ctx.channel.bulkDelete(amount, true);
      const msg = await ctx.reply(ok(`🧹 Cleared ${deleted.size} messages!`));
      if (!ctx.isSlash && msg?.delete) setTimeout(() => msg.delete().catch(() => {}), 4000);
    },
  },
  {
    name: 'setnick', description: 'Change a member\'s nickname | تغيير اسم عضو', permission: PermissionFlagsBits.ManageNicknames,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'nickname', type: 'string', required: true, consumeRest: true, description: 'New nickname' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const nickname = ctx.getString('nickname');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!nickname) return ctx.reply(fail('❌ You must provide a nickname.'));
      if (!member.manageable) return ctx.reply(fail('❌ I cannot edit this member\'s nickname.'));
      await member.setNickname(nickname);
      return ctx.reply(ok(`🏷️ ${member.user.tag}'s nickname has been changed to ${nickname}!`));
    },
  },
  {
    name: 'points', description: 'Manage member points | نظام نقاط الأعضاء', permission: PermissionFlagsBits.ManageGuild,
    options: [
      { name: 'action', type: 'string', required: true, description: 'add / remove / show' },
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'amount', type: 'integer', required: false, description: 'Points amount' },
    ],
    execute: async (ctx) => {
      const action = (ctx.getString('action') || '').toLowerCase();
      const member = await ctx.getUserMember('user');
      const amount = ctx.getInteger('amount') || 0;
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (action === 'add') return ctx.reply(ok(`✅ Added ${Math.abs(amount)} points to ${member.user.tag}! Balance: ${addPoints(ctx.guild.id, member.id, Math.abs(amount))}`));
      if (action === 'remove') return ctx.reply(ok(`✅ Removed ${Math.abs(amount)} points from ${member.user.tag}! Balance: ${addPoints(ctx.guild.id, member.id, -Math.abs(amount))}`));
      if (action === 'show') return ctx.reply(ok(`📊 ${member.user.tag}'s balance: ${getPoints(ctx.guild.id, member.id)} points.`));
      return ctx.reply(fail('❌ Invalid action, use: add / remove / show'));
    },
  },
  {
    name: 'lock', description: 'Lock a channel | قفل الروم', permission: PermissionFlagsBits.ManageChannels,
    options: [{ name: 'channel', type: 'channel', required: false, description: 'The channel (optional)' }],
    execute: async (ctx) => {
      const channel = ctx.getChannel('channel') || ctx.channel;
      await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false });
      return ctx.reply(ok(`🔒 #${channel.name} has been locked!`));
    },
  },
  {
    name: 'unlock', description: 'Unlock a channel | فتح الروم', permission: PermissionFlagsBits.ManageChannels,
    options: [{ name: 'channel', type: 'channel', required: false, description: 'The channel (optional)' }],
    execute: async (ctx) => {
      const channel = ctx.getChannel('channel') || ctx.channel;
      await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: true });
      return ctx.reply(ok(`🔓 #${channel.name} has been unlocked!`));
    },
  },
  {
    name: 'role', description: 'Toggle a role on a member | تبديل رتبة على عضو', permission: PermissionFlagsBits.ManageRoles,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'role', type: 'role', required: true, description: 'The role' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const role = ctx.getRole('role');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!role) return ctx.reply(fail('❌ Role not found.'));
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return ctx.reply(ok(`✅ Role ${role.name} has been removed from ${member.user.tag}!`));
      }
      await member.roles.add(role);
      return ctx.reply(ok(`✅ Role ${role.name} has been added to ${member.user.tag}!`));
    },
  },
  {
    name: 'role-add', description: 'Add a role to a member | إضافة رتبة لعضو', permission: PermissionFlagsBits.ManageRoles,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'role', type: 'role', required: true, description: 'The role' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const role = ctx.getRole('role');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!role) return ctx.reply(fail('❌ Role not found.'));
      if (member.roles.cache.has(role.id)) return ctx.reply(fail(`❌ ${member.user.tag} already has the role ${role.name}.`));
      await member.roles.add(role);
      return ctx.reply(ok(`✅ Role ${role.name} has been added to ${member.user.tag}!`));
    },
  },
  {
    name: 'role-remove', description: 'Remove a role from a member | إزالة رتبة من عضو', permission: PermissionFlagsBits.ManageRoles,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'role', type: 'role', required: true, description: 'The role' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      const role = ctx.getRole('role');
      if (!member) return ctx.reply(fail('❌ Member not found.'));
      if (!role) return ctx.reply(fail('❌ Role not found.'));
      if (!member.roles.cache.has(role.id)) return ctx.reply(fail(`❌ ${member.user.tag} does not have the role ${role.name}.`));
      await member.roles.remove(role);
      return ctx.reply(ok(`✅ Role ${role.name} has been removed from ${member.user.tag}!`));
    },
  },
  {
    name: 'setcolor', description: 'Change a role\'s color | تغيير لون رتبة', permission: PermissionFlagsBits.ManageRoles,
    options: [
      { name: 'role', type: 'role', required: true, description: 'The role' },
      { name: 'color', type: 'string', required: true, description: 'HEX color, e.g. #ff0000' },
    ],
    execute: async (ctx) => {
      const role = ctx.getRole('role');
      const color = ctx.getString('color');
      if (!role) return ctx.reply(fail('❌ Role not found.'));
      if (!color || !/^#?[0-9a-fA-F]{6}$/.test(color)) return ctx.reply(fail('❌ Invalid color format, use e.g. #ff0000'));
      await role.setColor(color.startsWith('#') ? color : `#${color}`);
      return ctx.reply(ok(`🎨 Role ${role.name}'s color has been updated!`));
    },
  },
  {
    name: 'slowmode', description: 'Set slowmode for a channel | ضبط الوضع البطيء', permission: PermissionFlagsBits.ManageChannels,
    options: [
      { name: 'seconds', type: 'integer', required: true, description: 'Seconds (0 to disable)' },
      { name: 'channel', type: 'channel', required: false, description: 'The channel (optional)' },
    ],
    execute: async (ctx) => {
      const seconds = ctx.getInteger('seconds');
      const channel = ctx.getChannel('channel') || ctx.channel;
      if (seconds === null || seconds < 0 || seconds > 21600) return ctx.reply(fail('❌ Value must be between 0 and 21600 seconds.'));
      await channel.setRateLimitPerUser(seconds);
      return ctx.reply(ok(seconds === 0 ? `✅ Slowmode disabled in #${channel.name}!` : `🐢 Slowmode set to ${seconds}s in #${channel.name}!`));
    },
  },
  {
    name: 'embed', description: 'Send a custom announcement message | إرسال رسالة مخصصة', permission: PermissionFlagsBits.ManageMessages,
    options: [
      { name: 'title', type: 'string', required: true, description: 'Message title' },
      { name: 'description', type: 'string', required: true, consumeRest: true, description: 'Message text (use | in prefix mode to separate title/text)' },
      { name: 'channel', type: 'channel', required: false, description: 'The channel (optional)' },
    ],
    execute: async (ctx) => {
      let title, description, channel;
      if (ctx.isSlash) {
        title = ctx.getString('title');
        description = ctx.getString('description');
        channel = ctx.getChannel('channel') || ctx.channel;
      } else {
        const tokens = [...(ctx.args || [])];
        channel = ctx.channel;
        if (tokens[0] && /^<#\d+>$/.test(tokens[0])) channel = resolveChannelMention(ctx.guild, tokens.shift()) || ctx.channel;
        if (!tokens.length) return ctx.reply(fail('❌ Usage: -embed [#channel] title | description'));
        const [t, d] = tokens.join(' ').split('|').map((s) => s?.trim());
        title = t || '📢 Announcement';
        description = d || t;
      }
      await channel.send({ content: `📢 **${title}**\n${description}` });
      return ctx.reply(ok(`✅ Message sent to ${channel}!`));
    },
  },
  {
    name: 'say', description: 'Make the bot send a message | إرسال رسالة بواسطة البوت', permission: PermissionFlagsBits.ManageMessages,
    options: [
      { name: 'message', type: 'string', required: true, consumeRest: true, description: 'The message content' },
      { name: 'channel', type: 'channel', required: false, description: 'The channel (optional)' },
    ],
    execute: async (ctx) => {
      let message, channel;
      if (ctx.isSlash) {
        message = ctx.getString('message');
        channel = ctx.getChannel('channel') || ctx.channel;
      } else {
        const tokens = [...(ctx.args || [])];
        channel = ctx.channel;
        if (tokens[0] && /^<#\d+>$/.test(tokens[0])) channel = resolveChannelMention(ctx.guild, tokens.shift()) || ctx.channel;
        message = tokens.join(' ');
      }
      if (!message) return ctx.reply(fail('❌ You must provide a message.'));
      await channel.send({ content: message });
      return ctx.reply(ok(`✅ Message sent to ${channel}!`));
    },
  },
  {
    name: 'botinfo', description: 'View bot info and status | عرض معلومات البوت', options: [],
    execute: async (ctx) => {
      const client = ctx.raw.client;
      const text = [
        '🤖 OS System Engine — Bot Info',
        `📡 Servers: ${client.guilds.cache.size}`,
        `👥 Users: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`,
        `📶 Ping: ${client.ws.ping}ms`,
        `⏱️ Uptime: ${formatUptime(client.uptime)}`,
      ].join('\n');
      return ctx.reply(text);
    },
  },
  {
    name: 'help', description: 'View the interactive help menu | قائمة المساعدة', options: [
      { name: 'command', type: 'string', required: false, description: 'View details for a specific command' },
    ],
    execute: async (ctx) => {
      const commandName = ctx.getString('command');

      if (ctx.isSlash) {
        const user = ctx.invoker.user;
        if (commandName) {
          const detailEmbed = buildCommandDetailEmbed(commandName.toLowerCase().trim(), user);
          if (!detailEmbed) return ctx.raw.reply({ content: `❌ Command \`${commandName}\` not found.`, ephemeral: true });
          return ctx.raw.reply({ embeds: [detailEmbed], ephemeral: true });
        }
        await ctx.raw.reply({ embeds: [buildMainHelpEmbed(user)], components: [buildHelpSelectRow()], ephemeral: true });
        const message = await ctx.raw.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async (i) => {
          if (i.user.id !== user.id) return i.reply({ content: '❌ This menu is not for you.', ephemeral: true });
          await i.update({ embeds: [buildCategoryEmbed(i.values[0], user)] });
        });
        collector.on('end', async () => { try { await message.edit({ components: [] }); } catch {} });
      } else {
        // Ephemeral replies are only available for slash interactions.
        await ctx.raw.reply('ℹ️ Use the slash command `/help` for a private, interactive help menu (visible only to you).');
      }
    },
  },
];

module.exports = { commands };
