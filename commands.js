const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { getWarnings, addWarning, removeWarning, clearWarnings, getPoints, addPoints } = require('./database');
const { buildMainHelpEmbed, buildCategoryEmbed, buildCommandDetailEmbed, buildHelpSelectRow } = require('./helpHelper');

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

async function getTargetMember(ctx, paramName = 'user') {
  try {
    if (ctx.isSlash) {
      const user = ctx.raw.options.getUser(paramName);
      if (!user) return null;
      return await ctx.guild.members.fetch(user.id).catch(() => null);
    }
    const raw = ctx.args[0];
    if (!raw) return null;
    const id = raw.replace(/[<@!>]/g, '');
    return await ctx.guild.members.fetch(id).catch(() => null);
  } catch {
    return null;
  }
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

const commands = [
  {
    name: 'ban', description: 'Ban a member from the server | حظر عضو من السيرفر', permission: PermissionFlagsBits.BanMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to ban' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason for the ban' },
      { name: 'bulk', type: 'integer', required: false, description: 'Delete messages from the last X days (0-7)' },
      { name: 'time', type: 'string', required: false, description: 'Temporary ban duration' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const reason = ctx.getString('reason') || 'No reason provided';
      let bulk = ctx.getInteger('bulk') || 0;
      const time = ctx.getString('time');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!member.bannable) return ctx.reply(`❌ | You can't ban ${member.user.tag}.`);
      if (bulk < 0) bulk = 0;
      if (bulk > 7) bulk = 7;
      const ms = time ? parseDuration(time) : null;
      if (time && (!ms || ms <= 0)) return ctx.reply('❌ | Invalid duration. Example: 1d, 12h, 30m');
      try {
        await member.ban({ reason, deleteMessageSeconds: bulk * 86400 });
        if (ms) scheduleTempUnban(ctx.guild, member.id, ms);
        let out = `✈️ | **${member.user.tag}** has been banned!`;
        if (ms) out += ` (Duration: ${time})`;
        return ctx.reply(out);
      } catch (e) {
        return ctx.reply(`❌ | Failed to ban member: ${e.message}`);
      }
    },
  },
  {
    name: 'unban', description: 'Unban a user by ID | فك حظر عضو عبر الآيدي', permission: PermissionFlagsBits.BanMembers,
    options: [{ name: 'user_id', type: 'string', required: true, description: 'The ID of the user to unban' }],
    execute: async (ctx) => {
      const id = ctx.getString('user_id');
      if (!id) return ctx.reply('❌ | You must provide a user ID.');
      try {
        await ctx.guild.bans.remove(id, 'Unbanned via command');
        return ctx.reply(`✅ | User **${id}** has been unbanned!`);
      } catch { return ctx.reply('❌ | No ban found for this ID.'); }
    },
  },
  {
    name: 'kick', description: 'Kick a member from the server | طرد عضو من السيرفر', permission: PermissionFlagsBits.KickMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to kick' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason for the kick' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const reason = ctx.getString('reason') || 'No reason provided';
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!member.kickable) return ctx.reply(`❌ | You can't kick ${member.user.tag}.`);
      try {
        await member.kick(reason);
        return ctx.reply(`✅ | **${member.user.tag}** has been kicked!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to kick member: ${e.message}`);
      }
    },
  },
  {
    name: 'vkick', description: 'Disconnect a member from their voice channel | طرد عضو من الروم الصوتي', permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to disconnect' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!member.voice.channel) return ctx.reply('❌ | Member is not in a voice channel.');
      await member.voice.disconnect(ctx.getString('reason') || 'Voice kick via command');
      return ctx.reply(`✅ | **${member.user.tag}** has been kicked from the voice channel!`);
    },
  },
  {
    name: 'vmove', description: 'Move a member to another voice channel | نقل عضو لروم صوتي آخر', permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to move' },
      { name: 'channel', type: 'voice_channel', required: false, description: 'Target voice channel (optional)' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      let channel = ctx.getChannel('channel');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!member.voice.channel) return ctx.reply('❌ | Member is not in a voice channel.');
      
      if (!channel) {
        const invokerMember = await ctx.guild.members.fetch(ctx.invoker.id).catch(() => null);
        channel = invokerMember?.voice?.channel;
      }

      if (!channel || channel.type !== ChannelType.GuildVoice) {
        return ctx.reply('❌ | You must be in a voice channel or specify a channel.');
      }

      await member.voice.setChannel(channel);
      return ctx.reply(`✅ | **${member.user.tag}** has been moved to <#${channel.id}>!`);
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
      const member = await getTargetMember(ctx, 'user');
      const durationRaw = ctx.getString('duration');
      const reason = ctx.getString('reason') || 'No reason provided';
      const ms = parseDuration(durationRaw);
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!ms || ms <= 0 || ms > 28 * 86400000) return ctx.reply('❌ | Invalid duration (max 28 days). Example: 10m, 2h, 1d');
      if (!member.moderatable) return ctx.reply(`❌ | You can't timeout ${member.user.tag}.`);
      try {
        await member.timeout(ms, reason);
        return ctx.reply(`✅ | **${member.user.tag}** has been timed out for ${durationRaw}!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to timeout member: ${e.message}`);
      }
    },
  },
  {
    name: 'untimeout', description: 'Remove a timeout from a member | إلغاء الإسكات المؤقت', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      try {
        await member.timeout(null);
        return ctx.reply(`✅ | **${member.user.tag}**'s timeout has been removed!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to remove timeout: ${e.message}`);
      }
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
      const member = await getTargetMember(ctx, 'user');
      const durationRaw = ctx.getString('duration');
      const reason = ctx.getString('reason') || 'No reason provided';
      const ms = parseDuration(durationRaw);
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!ms || ms <= 0 || ms > 28 * 86400000) return ctx.reply('❌ | Invalid duration (max 28 days). Example: 10m, 2h, 1d');
      if (!member.moderatable) return ctx.reply(`❌ | You can't mute ${member.user.tag}.`);
      try {
        await member.timeout(ms, reason);
        return ctx.reply(`✅ | **${member.user.tag}** has been muted for ${durationRaw}!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to mute member: ${e.message}`);
      }
    },
  },
  {
    name: 'unmute', description: 'Remove a mute from a member | إلغاء الكتم', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      try {
        await member.timeout(null);
        return ctx.reply(`✅ | **${member.user.tag}** has been unmuted!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to unmute member: ${e.message}`);
      }
    },
  },
  {
    name: 'mutetext', description: 'Mute a member from text channels | كتم عضو عن الكتابة', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const reason = ctx.getString('reason') || 'No reason provided';
      if (!member) return ctx.reply('❌ | Member not found.');
      const role = await ensureMutedRole(ctx.guild);
      await member.roles.add(role, reason);
      return ctx.reply(`✅ | **${member.user.tag}** has been muted from text!`);
    },
  },
  {
    name: 'unmutetext', description: 'Unmute a member from text channels | إلغاء كتم الكتابة', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      const role = await ensureMutedRole(ctx.guild);
      await member.roles.remove(role);
      return ctx.reply(`✅ | **${member.user.tag}** has been unmuted from text!`);
    },
  },
  {
    name: 'mutevoice', description: 'Server-mute a member in voice | كتم صوت عضو', permission: PermissionFlagsBits.MuteMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'reason', type: 'string', required: false, consumeRest: true, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!member.voice.channel) return ctx.reply('❌ | Member is not in a voice channel.');
      await member.voice.setMute(true, ctx.getString('reason') || 'Voice mute via command');
      return ctx.reply(`✅ | **${member.user.tag}** has been muted from voice!`);
    },
  },
  {
    name: 'unmutevoice', description: 'Remove voice mute from a member | إلغاء كتم صوت عضو', permission: PermissionFlagsBits.MuteMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      await member.voice.setMute(false, 'Voice unmute via command');
      return ctx.reply(`✅ | **${member.user.tag}** has been unmuted from voice!`);
    },
  },
  {
    name: 'warn', description: 'Warn a member | إضافة تحذير لعضو', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'reason', type: 'string', required: true, consumeRest: true, description: 'Reason for the warning' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const reason = ctx.getString('reason');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!reason) return ctx.reply('❌ | You must provide a reason.');
      const warning = addWarning(ctx.guild.id, member.id, reason, ctx.invoker.id);
      return ctx.reply(`✅ | **${member.user.tag}** has been warned! (ID: ${warning.id})`);
    },
  },
  {
    name: 'warn_remove', description: 'Remove a specific warning | حذف تحذير معين', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'warn_id', type: 'string', required: true, description: 'The warning ID' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const warnId = ctx.getString('warn_id');
      if (!member) return ctx.reply('❌ | Member not found.');
      const removed = removeWarning(ctx.guild.id, member.id, warnId);
      if (!removed) return ctx.reply('❌ | No warning found with this ID.');
      return ctx.reply(`✅ | Warning **${warnId}** has been removed from **${member.user.tag}**!`);
    },
  },
  {
    name: 'clearwarns', description: 'Clear all warnings for a member | حذف كل تحذيرات عضو', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 'user', required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      const count = clearWarnings(ctx.guild.id, member.id);
      if (!count) return ctx.reply(`❌ | **${member.user.tag}** has no warnings to clear.`);
      return ctx.reply(`✅ | Cleared **${count}** warning(s) for **${member.user.tag}**!`);
    },
  },
  {
    name: 'clear', description: 'Bulk delete messages (1-100) | حذف عدد من الرسائل', permission: PermissionFlagsBits.ManageMessages,
    options: [{ name: 'amount', type: 'integer', required: true, description: 'Number of messages to delete (1-100)' }],
    execute: async (ctx) => {
      let amount = ctx.getInteger('amount');
      if (!amount || amount < 1) return ctx.reply('❌ | Enter a number between 1 and 100.');
      if (amount > 100) amount = 100;
      const deleted = await ctx.channel.bulkDelete(amount, true);
      const msg = await ctx.reply(`✅ | Cleared **${deleted.size}** messages!`);
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
      const member = await getTargetMember(ctx, 'user');
      const nickname = ctx.getString('nickname');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!nickname) return ctx.reply('❌ | You must provide a nickname.');
      if (!member.manageable) return ctx.reply(`❌ | You can't edit ${member.user.tag}'s nickname.`);
      await member.setNickname(nickname);
      return ctx.reply(`✅ | **${member.user.tag}**'s nickname has been changed to **${nickname}**!`);
    },
  },
  {
    name: 'lock', description: 'Lock a channel | قفل الروم', permission: PermissionFlagsBits.ManageChannels,
    options: [{ name: 'channel', type: 'channel', required: false, description: 'The channel (optional)' }],
    execute: async (ctx) => {
      const targetChannel = ctx.getChannel('channel') || ctx.channel;
      await targetChannel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false });
      return ctx.reply(`🔒 | <#${targetChannel.id}> has been locked!`);
    },
  },
  {
    name: 'unlock', description: 'Unlock a channel | فتح الروم', permission: PermissionFlagsBits.ManageChannels,
    options: [{ name: 'channel', type: 'channel', required: false, description: 'The channel (optional)' }],
    execute: async (ctx) => {
      const targetChannel = ctx.getChannel('channel') || ctx.channel;
      await targetChannel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: true });
      return ctx.reply(`🔓 | <#${targetChannel.id}> has been unlocked!`);
    },
  },
  {
    name: 'role', description: 'Toggle a role on a member | تبديل رتبة على عضو', permission: PermissionFlagsBits.ManageRoles,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member' },
      { name: 'role', type: 'role', required: true, description: 'The role' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const role = ctx.getRole('role');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!role) return ctx.reply('❌ | Role not found.');
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return ctx.reply(`✅ | Role **${role.name}** removed from **${member.user.tag}**!`);
      }
      await member.roles.add(role);
      return ctx.reply(`✅ | Role **${role.name}** added to **${member.user.tag}**!`);
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
      const targetChannel = ctx.getChannel('channel') || ctx.channel;
      if (seconds === null || seconds < 0 || seconds > 21600) return ctx.reply('❌ | Value must be between 0 and 21600 seconds.');
      await targetChannel.setRateLimitPerUser(seconds);
      if (seconds === 0) {
        return ctx.reply(`🐢 | Slowmode disabled in <#${targetChannel.id}>!`);
      } else {
        return ctx.reply(`🐢 | Slowmode set to ${seconds}s in <#${targetChannel.id}>!`);
      }
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
          if (!detailEmbed) return ctx.raw.reply({ content: `❌ | Command \`${commandName}\` not found.`, ephemeral: true });
          return ctx.raw.reply({ embeds: [detailEmbed], ephemeral: true });
        }
        await ctx.raw.reply({ embeds: [buildMainHelpEmbed(user)], components: [buildHelpSelectRow()], ephemeral: true });
        const message = await ctx.raw.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async (i) => {
          if (i.user.id !== user.id) return i.reply({ content: '❌ | This menu is not for you.', ephemeral: true });
          await i.update({ embeds: [buildCategoryEmbed(i.values[0], user)] });
        });
        collector.on('end', async () => { try { await message.edit({ components: [] }); } catch {} });
      } else {
        await ctx.raw.reply('ℹ️ | Use `/help` for an interactive menu.');
      }
    },
  },
];

module.exports = { commands };
