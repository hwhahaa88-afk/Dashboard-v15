const { PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getWarnings, addWarning, removeWarning, clearWarnings, getPoints, addPoints } = require('./database');
const { buildMainHelpEmbed, buildCategoryEmbed, buildCommandDetailEmbed, buildHelpSelectRow } = require('./helpHelper');

// ProBot-style reply: "**emoji | message**"
function r(emoji, text) { return `**${emoji} | ${text}**`; }

function resolveChannelMention(guild, raw) {
  if (!raw) return null;
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
  let role = guild.roles.cache.find((rl) => rl.name === 'Muted-Text');
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
// /warn — automatic role-based punishments
// ---------------------------------------------------------------------------
const WARN_ROLE_PUNISHMENTS = {
  '1543516457122533417': { type: 'mute_full', durationMs: 30 * 60000, label: 'Mute Text + Mute Voice + Deafen for 30 minutes' },
  '1543516888104173578': { type: 'timeout', durationMs: 40 * 60000, label: 'Timeout for 40 minutes' },
  '1543516968747929651': { type: 'timeout', durationMs: 24 * 60 * 60000, label: 'Timeout for 1 day' },
};

const tempMuteTimers = new Map();
function scheduleMuteRevert(guild, userId, ms) {
  const key = `${guild.id}-${userId}`;
  if (tempMuteTimers.has(key)) clearTimeout(tempMuteTimers.get(key));
  const timer = setTimeout(async () => {
    try {
      const member = await guild.members.fetch(userId);
      const role = await ensureMutedRole(guild);
      await member.roles.remove(role).catch(() => {});
      if (member.voice.channel) {
        await member.voice.setMute(false, 'Automatic mute expired').catch(() => {});
        await member.voice.setDeaf(false, 'Automatic mute expired').catch(() => {});
      }
    } catch {}
    tempMuteTimers.delete(key);
  }, ms);
  tempMuteTimers.set(key, timer);
}

async function applyWarnPunishment(guild, member) {
  let matched = null;
  for (const [roleId, cfg] of Object.entries(WARN_ROLE_PUNISHMENTS)) {
    if (member.roles.cache.has(roleId)) { matched = cfg; break; }
  }
  if (!matched) return null;

  if (matched.type === 'timeout') {
    try { await member.timeout(matched.durationMs, 'Automatic punishment from warning'); } catch {}
  } else if (matched.type === 'mute_full') {
    try {
      const role = await ensureMutedRole(guild);
      await member.roles.add(role, 'Automatic punishment from warning');
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Automatic punishment from warning').catch(() => {});
        await member.voice.setDeaf(true, 'Automatic punishment from warning').catch(() => {});
      }
      scheduleMuteRevert(guild, member.id, matched.durationMs);
    } catch {}
  }
  return matched;
}

async function sendWarnDM(member, guild, reason) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('⚠️ You have received a warning')
      .setDescription(`You have been warned in **${guild.name}**.`)
      .addFields({ name: 'Reason', value: reason })
      .setTimestamp();
    await member.send({ embeds: [embed] });
  } catch { /* DMs closed — ignore silently */ }
}

async function sendWarnTranscript(guild, moderatorTag, member, reason, warning, punishment) {
  const channelId = process.env.TRANSCRIPT_CHANNEL_ID;
  if (!channelId) return;
  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased?.()) return;
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('⚠️ Warning Issued')
      .addFields(
        { name: 'Member', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Moderator', value: moderatorTag, inline: true },
        { name: 'Reason', value: reason },
        { name: 'Warn ID', value: warning.id, inline: true },
      );
    if (punishment) embed.addFields({ name: 'Auto Punishment', value: punishment.label });
    embed.setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch { /* invalid channel / no perms — ignore silently */ }
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
      const targetUser = ctx.getUser('user');
      const member = await ctx.getUserMember('user');
      const reason = ctx.getString('reason') || 'No reason provided';
      let bulk = ctx.getInteger('bulk') || 0;
      const time = ctx.getString('time');

      if (!targetUser) return ctx.reply(r('❌', 'User not found.'));
      const username = targetUser.username || targetUser.tag || 'User';

      if (member && !member.bannable) return ctx.reply(r('🙄', `You can't ban ${username}.`));
      if (bulk < 0) bulk = 0;
      if (bulk > 7) bulk = 7;
      const ms = time ? parseDuration(time) : null;
      if (time && (!ms || ms <= 0)) return ctx.reply(r('❌', 'Invalid duration. Example: 1d, 12h, 30m'));

      await ctx.guild.members.ban(targetUser.id, { reason, deleteMessageSeconds: bulk * 86400 });
      if (ms) scheduleTempUnban(ctx.guild, targetUser.id, ms);

      let body = `${username} has been banned from the server`;
      if (ms) body += `\n⏱️ Duration: ${time}`;
      body += `\n📝 Reason: ${reason}`;
      return ctx.reply(r('✈️', body));
    },
  },
  {
    name: 'unban', description: 'Unban a user by ID | فك حظر عضو عبر الآيدي', permission: PermissionFlagsBits.BanMembers,
    options: [{ name: 'user_id', type: 'string', required: true, description: 'The ID of the user to unban' }],
    execute: async (ctx) => {
      const id = ctx.getString('user_id');
      if (!id) return ctx.reply(r('❌', 'You must provide a user ID.'));
      try {
        let displayName = id;
        try {
          const fetchedUser = await ctx.raw.client.users.fetch(id);
          if (fetchedUser) displayName = fetchedUser.username || fetchedUser.tag;
        } catch { /* fall back to raw ID */ }
        await ctx.guild.bans.remove(id, 'Unbanned via command');
        return ctx.reply(r('🔓', `${displayName} has been unbanned from the server!`));
      } catch { return ctx.reply(r('❌', 'No ban found for this ID.')); }
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!member.kickable) return ctx.reply(r('🙄', `You can't kick ${member.user.username}.`));
      await member.kick(reason);
      return ctx.reply(r('👢', `${member.user.username} has been kicked!\n📝 Reason: ${reason}`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!member.voice.channel) return ctx.reply(r('❌', 'Member is not in a voice channel.'));
      await member.voice.disconnect(ctx.getString('reason') || 'Voice kick via command');
      return ctx.reply(r('🔊', `${member.user.username} has been kicked from the voice channel!`));
    },
  },
  {
    name: 'vmove', description: 'Move a member to another voice channel | نقل عضو لروم صوتي آخر', permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to move' },
      { name: 'channel', type: 'voice_channel', required: false, description: 'Target voice channel (optional)' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!member.voice.channel) return ctx.reply(r('❌', 'Member is not in a voice channel.'));

      let channel = ctx.getChannel('channel');
      if (!channel || channel.type !== ChannelType.GuildVoice) {
        const invokerMember = await ctx.guild.members.fetch(ctx.invoker.id).catch(() => null);
        channel = invokerMember?.voice?.channel;
      }
      if (!channel) return ctx.reply(r('❌', 'You must specify a voice channel or be in one yourself.'));

      await member.voice.setChannel(channel);
      return ctx.reply(r('🔀', `${member.user.username} has been moved to #${channel.name}!`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!ms || ms <= 0 || ms > 28 * 86400000) return ctx.reply(r('❌', 'Invalid duration (max 28 days). Example: 10m, 2h, 1d'));
      await member.timeout(ms, reason);
      return ctx.reply(r('⏱️', `${member.user.username} has been timed out for ${durationRaw}!\n📝 Reason: ${reason}`));
    },
  },
  {
    name: 'untimeout', description: 'Remove a timeout from a member | إلغاء الإسكات المؤقت', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      await member.timeout(null);
      return ctx.reply(r('✅', `${member.user.username}'s timeout has been removed!`));
    },
  },
  {
    name: 'mute', description: 'Mute a member for a duration | كتم عضو لمدة محددة', permission: PermissionFlagsBits.ModerateMembers,
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!ms || ms <= 0 || ms > 28 * 86400000) return ctx.reply(r('❌', 'Invalid duration (max 28 days). Example: 10m, 2h, 1d'));
      await member.timeout(ms, reason);
      return ctx.reply(r('🔇', `${member.user.username} has been muted for ${durationRaw}!\n📝 Reason: ${reason}`));
    },
  },
  {
    name: 'unmute', description: 'Remove a mute from a member | إلغاء الكتم', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      await member.timeout(null);
      return ctx.reply(r('🔊', `${member.user.username} has been unmuted!`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      const role = await ensureMutedRole(ctx.guild);
      await member.roles.add(role, reason);
      return ctx.reply(r('🔇', `${member.user.username} has been muted from text!\n📝 Reason: ${reason}`));
    },
  },
  {
    name: 'unmutetext', description: 'Unmute a member from text channels | إلغاء كتم الكتابة', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      const role = await ensureMutedRole(ctx.guild);
      await member.roles.remove(role);
      return ctx.reply(r('🔊', `${member.user.username} has been unmuted from text!`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!member.voice.channel) return ctx.reply(r('❌', 'Member is not in a voice channel.'));
      await member.voice.setMute(true, ctx.getString('reason') || 'Voice mute via command');
      return ctx.reply(r('🔇', `${member.user.username} has been muted from voice!`));
    },
  },
  {
    name: 'unmutevoice', description: 'Remove voice mute from a member | إلغاء كتم صوت عضو', permission: PermissionFlagsBits.MuteMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      await member.voice.setMute(false, 'Voice unmute via command');
      return ctx.reply(r('🔊', `${member.user.username} has been unmuted from voice!`));
    },
  },
  {
    name: 'vmute', description: 'Server-mute a member in voice | كتم صوتي', permission: PermissionFlagsBits.MuteMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!member.voice.channel) return ctx.reply(r('❌', 'Member is not in a voice channel.'));
      await member.voice.setMute(true, ctx.getString('reason') || 'Voice mute via command');
      return ctx.reply(r('🔇', `${member.user.username} has been muted from voice!`));
    },
  },
  {
    name: 'vunmute', description: 'Remove voice mute from a member | إلغاء الكتم الصوتي', permission: PermissionFlagsBits.MuteMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      await member.voice.setMute(false, 'Voice unmute via command');
      return ctx.reply(r('🔊', `${member.user.username} has been unmuted from voice!`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!reason) return ctx.reply(r('❌', 'You must provide a reason.'));

      const warning = addWarning(ctx.guild.id, member.id, reason, ctx.invoker.id);
      await sendWarnDM(member, ctx.guild, reason);
      const punishment = await applyWarnPunishment(ctx.guild, member);
      await sendWarnTranscript(ctx.guild, ctx.invoker.user.tag, member, reason, warning, punishment);

      return ctx.reply(r('✅', `${member.user.username} has been warned!!`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      const removed = removeWarning(ctx.guild.id, member.id, warnId);
      if (!removed) return ctx.reply(r('❌', 'No warning found with this ID.'));
      return ctx.reply(r('✅', `Warning ${warnId} has been removed from ${member.user.username}!`));
    },
  },
  {
    name: 'warnings', description: 'View a member\'s warning history | عرض تحذيرات عضو', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      const warns = getWarnings(ctx.guild.id, member.id);
      if (!warns.length) return ctx.reply(r('✅', `${member.user.username} has no warnings.`));
      const list = warns.map((w, i) => `${i + 1}. ${w.id} - ${w.reason} (by <@${w.moderator_id}>)`).join('\n');
      return ctx.reply(r('⚠️', `Warnings — ${member.user.username}\n${list}`));
    },
  },
  {
    name: 'clearwarns', description: 'Clear all warnings for a member | حذف كل تحذيرات عضو', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      const count = clearWarnings(ctx.guild.id, member.id);
      if (!count) return ctx.reply(r('✅', `${member.user.username} had no warnings to clear.`));
      return ctx.reply(r('🧹', `Cleared ${count} warning(s) for ${member.user.username}!`));
    },
  },
  {
    name: 'clear', description: 'Bulk delete messages (1-100) | حذف عدد من الرسائل', permission: PermissionFlagsBits.ManageMessages,
    options: [{ name: 'amount', type: 'integer', required: true, description: 'Number of messages to delete (1-100) | عدد الرسائل' }],
    execute: async (ctx) => {
      let amount = ctx.getInteger('amount');
      if (!amount || amount < 1) return ctx.reply(r('❌', 'Enter a number between 1 and 100.'));
      if (amount > 100) amount = 100;

      const clearText = (count) => `**Deleted \`${count}\` messages.**`;

      if (ctx.isSlash) {
        await ctx.raw.deferReply({ ephemeral: false });
        const deleted = await ctx.channel.bulkDelete(amount, true);
        await ctx.raw.editReply(clearText(deleted.size));
        setTimeout(() => ctx.raw.deleteReply().catch(() => {}), 1500);
      } else {
        const deleted = await ctx.channel.bulkDelete(amount, true);
        const msg = await ctx.reply(clearText(deleted.size));
        if (msg?.delete) setTimeout(() => msg.delete().catch(() => {}), 1500);
      }
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!nickname) return ctx.reply(r('❌', 'You must provide a nickname.'));
      if (!member.manageable) return ctx.reply(r('🙄', `You can't edit ${member.user.username}'s nickname.`));
      await member.setNickname(nickname);
      return ctx.reply(r('🏷️', `${member.user.username}'s nickname has been changed to ${nickname}!`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (action === 'add') return ctx.reply(r('✅', `Added ${Math.abs(amount)} points to ${member.user.username}! Balance: ${addPoints(ctx.guild.id, member.id, Math.abs(amount))}`));
      if (action === 'remove') return ctx.reply(r('✅', `Removed ${Math.abs(amount)} points from ${member.user.username}! Balance: ${addPoints(ctx.guild.id, member.id, -Math.abs(amount))}`));
      if (action === 'show') return ctx.reply(r('📊', `${member.user.username}'s balance: ${getPoints(ctx.guild.id, member.id)} points.`));
      return ctx.reply(r('❌', 'Invalid action, use: add / remove / show'));
    },
  },
  {
    name: 'lock', description: 'Lock a channel | قفل الروم', permission: PermissionFlagsBits.ManageChannels,
    options: [{ name: 'channel', type: 'channel', required: false, description: 'The channel (optional)' }],
    execute: async (ctx) => {
      const channel = ctx.getChannel('channel') || ctx.channel;
      await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false });
      return ctx.reply(r('🔒', `#${channel.name} has been locked!`));
    },
  },
  {
    name: 'unlock', description: 'Unlock a channel | فتح الروم', permission: PermissionFlagsBits.ManageChannels,
    options: [{ name: 'channel', type: 'channel', required: false, description: 'The channel (optional)' }],
    execute: async (ctx) => {
      const channel = ctx.getChannel('channel') || ctx.channel;
      await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: true });
      return ctx.reply(r('🔓', `#${channel.name} has been unlocked!`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!role) return ctx.reply(r('❌', 'Role not found.'));
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return ctx.reply(r('✅', `Role ${role.name} has been removed from ${member.user.username}!`));
      }
      await member.roles.add(role);
      return ctx.reply(r('✅', `Role ${role.name} has been added to ${member.user.username}!`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!role) return ctx.reply(r('❌', 'Role not found.'));
      if (member.roles.cache.has(role.id)) return ctx.reply(r('🙄', `${member.user.username} already has the role ${role.name}.`));
      await member.roles.add(role);
      return ctx.reply(r('✅', `Role ${role.name} has been added to ${member.user.username}!`));
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
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!role) return ctx.reply(r('❌', 'Role not found.'));
      if (!member.roles.cache.has(role.id)) return ctx.reply(r('🙄', `${member.user.username} doesn't have the role ${role.name}.`));
      await member.roles.remove(role);
      return ctx.reply(r('✅', `Role ${role.name} has been removed from ${member.user.username}!`));
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
      if (!role) return ctx.reply(r('❌', 'Role not found.'));
      if (!color || !/^#?[0-9a-fA-F]{6}$/.test(color)) return ctx.reply(r('❌', 'Invalid color format, use e.g. #ff0000'));
      await role.setColor(color.startsWith('#') ? color : `#${color}`);
      return ctx.reply(r('🎨', `Role ${role.name}'s color has been updated!`));
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
      if (seconds === null || seconds < 0 || seconds > 21600) return ctx.reply(r('❌', 'Value must be between 0 and 21600 seconds.'));
      await channel.setRateLimitPerUser(seconds);
      return ctx.reply(seconds === 0 ? r('✅', `Slowmode disabled in #${channel.name}!`) : r('🐢', `Slowmode set to ${seconds}s in #${channel.name}!`));
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
        if (!tokens.length) return ctx.reply(r('❌', 'Usage: -embed [#channel] title | description'));
        const [t, d] = tokens.join(' ').split('|').map((s) => s?.trim());
        title = t || 'Announcement';
        description = d || t;
      }
      await channel.send({ content: `📢 **${title}**\n${description}` });
      return ctx.reply(r('✅', `Message sent to ${channel}!`));
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
      if (!message) return ctx.reply(r('❌', 'You must provide a message.'));
      await channel.send({ content: message });
      return ctx.reply(r('✅', `Message sent to ${channel}!`));
    },
  },
  {
    name: 'botinfo', description: 'View bot info and status | عرض معلومات البوت', options: [],
    execute: async (ctx) => {
      const client = ctx.raw.client;
      const text = [
        r('🤖', 'OS System Engine — Bot Info'),
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
          if (!detailEmbed) return ctx.raw.reply({ content: r('❌', `Command \`${commandName}\` not found.`), ephemeral: true });
          return ctx.raw.reply({ embeds: [detailEmbed], ephemeral: true });
        }
        await ctx.raw.reply({ embeds: [buildMainHelpEmbed(user)], components: [buildHelpSelectRow()], ephemeral: true });
        const message = await ctx.raw.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async (i) => {
          if (i.user.id !== user.id) return i.reply({ content: r('❌', 'This menu is not for you.'), ephemeral: true });
          await i.update({ embeds: [buildCategoryEmbed(i.values[0], user)] });
        });
        collector.on('end', async () => { try { await message.edit({ components: [] }); } catch {} });
      } else {
        await ctx.raw.reply('ℹ️ | Use the slash command `/help` for a private, interactive help menu (visible only to you).');
      }
    },
  },
];

module.exports = { commands };
