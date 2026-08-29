const { PermissionFlagsBits, ChannelType } = require('discord.js');
const msLib = require('ms');
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
  const duration = msLib(input);
  if (duration === undefined) return null;
  return duration;
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

const tempBans = new Map();
function scheduleTempUnban(guild, userId, duration) {
  const key = `${guild.id}-${userId}`;
  if (tempBans.has(key)) clearTimeout(tempBans.get(key));

  const timeout = setTimeout(async () => {
    try {
      await guild.bans.remove(userId, 'Temporary ban expired');
      tempBans.delete(key);
    } catch (e) {
      console.error(`Failed to unban ${userId}:`, e);
    }
  }, duration);

  tempBans.set(key, timeout);
}

const commands = [
  {
    name: 'ban',
    description: 'Ban a user from the server (inside or outside)',
    permission: PermissionFlagsBits.BanMembers,
    options: [
      { name: 'user_id', type: 3, required: true, description: 'The user ID to ban (or mention)' },
      { name: 'reason', type: 3, required: false, description: 'Reason for the ban' },
      { name: 'bulk', type: 4, required: false, description: 'Delete messages from last X days (0-7)' },
      { name: 'time', type: 3, required: false, description: 'Temporary ban duration (e.g. 1d, 12h, 30m)' }
    ],
    execute: async (ctx) => {
      if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return ctx.reply({ content: "❌ | I don't have permission to ban members.", ephemeral: true });
      }

      let userId = ctx.isSlash ? ctx.raw.options.getString('user_id') : (ctx.args[0] ? ctx.args[0].replace(/[<@!>]/g, '') : null);

      if (!userId) {
        return ctx.reply({ content: '❌ | You must provide a valid user ID or mention.', ephemeral: true });
      }

      const reason = ctx.isSlash ? (ctx.raw.options.getString('reason') || 'No reason provided') : (ctx.args[1] || 'No reason provided');
      let bulk = ctx.isSlash ? (ctx.raw.options.getInteger('bulk') || 0) : 0;
      bulk = Math.min(Math.max(bulk, 0), 7);
      const time = ctx.isSlash ? ctx.raw.options.getString('time') : null;

      const msDuration = time ? parseDuration(time) : null;
      if (time && (!msDuration || msDuration <= 0)) {
        return ctx.reply({ content: '❌ | Invalid duration. Example: 1d, 12h, 30m', ephemeral: true });
      }

      try {
        let displayName = userId;
        try {
          const fetchedUser = await ctx.client.users.fetch(userId);
          if (fetchedUser) displayName = fetchedUser.username;
        } catch {}

        await ctx.guild.bans.create(userId, { reason, deleteMessageSeconds: bulk * 86400 });

        if (msDuration) {
          scheduleTempUnban(ctx.guild, userId, msDuration);
        }

        let replyContent = `✈️ | **${displayName}** has been banned from the server!`;
        if (time) replyContent += ` (Duration: ${time})`;
        if (reason !== 'No reason provided') replyContent += ` \nReason: ${reason}`;

        return await ctx.reply(replyContent);

      } catch (e) {
        return ctx.reply({ content: `❌ | Failed to ban user: ${e.message}`, ephemeral: true });
      }
    }
  },
  {
    name: 'unban',
    description: 'Unban a user by ID',
    permission: PermissionFlagsBits.BanMembers,
    options: [
      { name: 'user_id', type: 3, required: true, description: 'The ID of the user to unban' }
    ],
    execute: async (ctx) => {
      if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return ctx.reply({ content: "❌ | I don't have permission to unban members.", ephemeral: true });
      }

      let userId = ctx.isSlash ? ctx.raw.options.getString('user_id') : (ctx.args[0] ? ctx.args[0].replace(/[<@!>]/g, '') : null);

      if (!userId) {
        return ctx.reply({ content: '❌ | You must provide a valid user ID.', ephemeral: true });
      }

      try {
        let displayName = userId;
        try {
          const user = await ctx.client.users.fetch(userId);
          if (user) displayName = user.username;
        } catch {}

        await ctx.guild.bans.remove(userId, 'Unbanned via command');

        return await ctx.reply(`✅ | **${displayName}** has been unbanned!`);

      } catch (e) {
        return ctx.reply({ content: "❌ | No ban found for this ID.", ephemeral: true });
      }
    }
  },
  {
    name: 'kick', description: 'Kick a member from the server', permission: PermissionFlagsBits.KickMembers,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member to kick' },
      { name: 'reason', type: 3, required: false, description: 'Reason for the kick' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const reason = ctx.getString('reason') || 'No reason provided';
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!member.kickable) return ctx.reply(`❌ | You can't kick ${member.user.tag}.`);
      try {
        await member.kick(reason);
        return ctx.reply(`✅ | **${member.user.username}** has been kicked!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to kick member: ${e.message}`);
      }
    },
  },
  {
    name: 'vkick', description: 'Disconnect a member from their voice channel', permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member to disconnect' },
      { name: 'reason', type: 3, required: false, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!member.voice.channel) return ctx.reply('❌ | Member is not in a voice channel.');
      await member.voice.disconnect(ctx.getString('reason') || 'Voice kick via command');
      return ctx.reply(`✅ | **${member.user.username}** has been kicked from the voice channel!`);
    },
  },
  {
    name: 'vmove', description: 'Move a member to another voice channel', permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member to move' },
      { name: 'channel', type: 7, required: false, description: 'Target voice channel (optional)' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');

      let targetChannel = null;
      if (ctx.isSlash) {
        targetChannel = ctx.raw.options.getChannel('channel');
      } else if (ctx.args[1]) {
        const id = ctx.args[1].replace(/[<#>]/g, '');
        targetChannel = ctx.guild.channels.cache.get(id);
      }

      if (!targetChannel) {
        const invokerMember = await ctx.guild.members.fetch(ctx.invoker.id).catch(() => null);
        targetChannel = invokerMember?.voice?.channel;
      }

      if (!targetChannel || (targetChannel.type !== ChannelType.GuildVoice && targetChannel.type !== ChannelType.GuildStageVoice)) {
        return ctx.reply('❌ | You must specify a voice channel or be connected to one.');
      }

      try {
        if (member.voice.channel) {
          await member.voice.setChannel(targetChannel);
        }
        return ctx.reply(`✅ | **${member.user.username}** has been moved to <#${targetChannel.id}>!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to move member: ${e.message}`);
      }
    },
  },
  {
    name: 'timeout', description: 'Timeout a member', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member to timeout' },
      { name: 'duration', type: 3, required: true, description: 'Duration, e.g. 10m, 2h, 1d' },
      { name: 'reason', type: 3, required: false, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const durationRaw = ctx.getString('duration');
      const reason = ctx.getString('reason') || 'No reason provided';
      const ms = parseDuration(durationRaw);
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!ms || ms <= 0 || ms > 28 * 86400000) return ctx.reply('❌ | Invalid duration (max 28 days). Example: 10m, 2h, 1d');
      if (!member.moderatable) return ctx.reply(`❌ | You can't timeout ${member.user.username}.`);
      try {
        await member.timeout(ms, reason);
        return ctx.reply(`✅ | **${member.user.username}** has been timed out for ${durationRaw}!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to timeout member: ${e.message}`);
      }
    },
  },
  {
    name: 'untimeout', description: 'Remove a timeout from a member', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 6, required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      try {
        await member.timeout(null);
        return ctx.reply(`✅ | **${member.user.username}**'s timeout has been removed!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to remove timeout: ${e.message}`);
      }
    },
  },
  {
    name: 'mute', description: 'Mute a member for a duration', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member to mute' },
      { name: 'duration', type: 3, required: true, description: 'Duration, e.g. 10m, 2h, 1d' },
      { name: 'reason', type: 3, required: false, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const durationRaw = ctx.getString('duration');
      const reason = ctx.getString('reason') || 'No reason provided';
      const ms = parseDuration(durationRaw);
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!ms || ms <= 0 || ms > 28 * 86400000) return ctx.reply('❌ | Invalid duration (max 28 days). Example: 10m, 2h, 1d');
      if (!member.moderatable) return ctx.reply(`❌ | You can't mute ${member.user.username}.`);
      try {
        await member.timeout(ms, reason);
        return ctx.reply(`✅ | **${member.user.username}** has been muted for ${durationRaw}!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to mute member: ${e.message}`);
      }
    },
  },
  {
    name: 'unmute', description: 'Remove a mute from a member', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 6, required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      try {
        await member.timeout(null);
        return ctx.reply(`✅ | **${member.user.username}** has been unmuted!`);
      } catch (e) {
        return ctx.reply(`❌ | Failed to unmute member: ${e.message}`);
      }
    },
  },
  {
    name: 'mutetext', description: 'Mute a member from text channels', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member' },
      { name: 'reason', type: 3, required: false, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const reason = ctx.getString('reason') || 'No reason provided';
      if (!member) return ctx.reply('❌ | Member not found.');
      const role = await ensureMutedRole(ctx.guild);
      await member.roles.add(role, reason);
      return ctx.reply(`✅ | **${member.user.username}** has been muted from text!`);
    },
  },
  {
    name: 'unmutetext', description: 'Unmute a member from text channels', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 6, required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      const role = await ensureMutedRole(ctx.guild);
      await member.roles.remove(role);
      return ctx.reply(`✅ | **${member.user.username}** has been unmuted from text!`);
    },
  },
  {
    name: 'mutevoice', description: 'Server-mute a member in voice', permission: PermissionFlagsBits.MuteMembers,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member' },
      { name: 'reason', type: 3, required: false, description: 'Reason' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!member.voice.channel) return ctx.reply('❌ | Member is not in a voice channel.');
      await member.voice.setMute(true, ctx.getString('reason') || 'Voice mute via command');
      return ctx.reply(`✅ | **${member.user.username}** has been muted from voice!`);
    },
  },
  {
    name: 'unmutevoice', description: 'Remove voice mute from a member', permission: PermissionFlagsBits.MuteMembers,
    options: [{ name: 'user', type: 6, required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      await member.voice.setMute(false, 'Voice unmute via command');
      return ctx.reply(`✅ | **${member.user.username}** has been unmuted from voice!`);
    },
  },
  {
    name: 'warn', description: 'Warn a member', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member' },
      { name: 'reason', type: 3, required: true, description: 'Reason for the warning' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const reason = ctx.getString('reason');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!reason) return ctx.reply('❌ | You must provide a reason.');
      const warning = addWarning(ctx.guild.id, member.id, reason, ctx.invoker.id);
      return ctx.reply(`✅ | **${member.user.username}** has been warned! (ID: ${warning.id})`);
    },
  },
  {
    name: 'warn_remove', description: 'Remove a specific warning', permission: PermissionFlagsBits.ModerateMembers,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member' },
      { name: 'warn_id', type: 3, required: true, description: 'The warning ID' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const warnId = ctx.getString('warn_id');
      if (!member) return ctx.reply('❌ | Member not found.');
      const removed = removeWarning(ctx.guild.id, member.id, warnId);
      if (!removed) return ctx.reply('❌ | No warning found with this ID.');
      return ctx.reply(`✅ | Warning **${warnId}** has been removed from **${member.user.username}**!`);
    },
  },
  {
    name: 'clearwarns', description: 'Clear all warnings for a member', permission: PermissionFlagsBits.ModerateMembers,
    options: [{ name: 'user', type: 6, required: true, description: 'The member' }],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      if (!member) return ctx.reply('❌ | Member not found.');
      const count = clearWarnings(ctx.guild.id, member.id);
      if (!count) return ctx.reply(`❌ | **${member.user.username}** has no warnings to clear.`);
      return ctx.reply(`✅ | Cleared **${count}** warning(s) for **${member.user.username}**!`);
    },
  },
  {
    name: 'clear', description: 'Bulk delete messages (1-100)', permission: PermissionFlagsBits.ManageMessages,
    options: [{ name: 'amount', type: 4, required: true, description: 'Number of messages to delete (1-100)' }],
    execute: async (ctx) => {
      let amount = ctx.getInteger('amount');
      if (!amount || amount < 1) return ctx.reply({ content: '❌ | Enter a number between 1 and 100.', ephemeral: true });
      if (amount > 100) amount = 100;

      if (ctx.isSlash) {
        await ctx.raw.deferReply({ ephemeral: true }).catch(() => {});
      }

      try {
        const deleted = await ctx.channel.bulkDelete(amount, true);
        if (ctx.isSlash) {
          return await ctx.raw.editReply({ content: `✅ | Cleared **${deleted.size}** messages!` });
        } else {
          return ctx.reply(`✅ | Cleared **${deleted.size}** messages!`);
        }
      } catch (e) {
        if (ctx.isSlash) {
          return await ctx.raw.editReply({ content: `❌ | Failed to clear messages: ${e.message}` });
        } else {
          return ctx.reply(`❌ | Failed to clear messages: ${e.message}`);
        }
      }
    },
  },
  {
    name: 'setnick', description: "Change a member's nickname", permission: PermissionFlagsBits.ManageNicknames,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member' },
      { name: 'nickname', type: 3, required: true, description: 'New nickname' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const nickname = ctx.getString('nickname');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!nickname) return ctx.reply('❌ | You must provide a nickname.');
      if (!member.manageable) return ctx.reply(`❌ | You can't edit ${member.user.username}'s nickname.`);
      await member.setNickname(nickname);
      return ctx.reply(`✅ | **${member.user.username}**'s nickname has been changed to **${nickname}**!`);
    },
  },
  {
    name: 'lock', description: 'Lock a channel', permission: PermissionFlagsBits.ManageChannels,
    options: [{ name: 'channel', type: 7, required: false, description: 'The channel (optional)' }],
    execute: async (ctx) => {
      const targetChannel = ctx.getChannel('channel') || ctx.channel;
      await targetChannel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false });
      return ctx.reply(`🔒 | <#${targetChannel.id}> has been locked!`);
    },
  },
  {
    name: 'unlock', description: 'Unlock a channel', permission: PermissionFlagsBits.ManageChannels,
    options: [{ name: 'channel', type: 7, required: false, description: 'The channel (optional)' }],
    execute: async (ctx) => {
      const targetChannel = ctx.getChannel('channel') || ctx.channel;
      await targetChannel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: true });
      return ctx.reply(`🔓 | <#${targetChannel.id}> has been unlocked!`);
    },
  },
  {
    name: 'role', description: 'Toggle a role on a member', permission: PermissionFlagsBits.ManageRoles,
    options: [
      { name: 'user', type: 6, required: true, description: 'The member' },
      { name: 'role', type: 8, required: true, description: 'The role' },
    ],
    execute: async (ctx) => {
      const member = await getTargetMember(ctx, 'user');
      const role = ctx.getRole('role');
      if (!member) return ctx.reply('❌ | Member not found.');
      if (!role) return ctx.reply('❌ | Role not found.');
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return ctx.reply(`✅ | Role **${role.name}** removed from **${member.user.username}**!`);
      }
      await member.roles.add(role);
      return ctx.reply(`✅ | Role **${role.name}** added to **${member.user.username}**!`);
    },
  },
  {
    name: 'slowmode', description: 'Set slowmode for a channel', permission: PermissionFlagsBits.ManageChannels,
    options: [
      { name: 'seconds', type: 4, required: true, description: 'Seconds (0 to disable)' },
      { name: 'channel', type: 7, required: false, description: 'The channel (optional)' },
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
    name: 'help', description: 'View the interactive help menu', options: [
      { name: 'command', type: 3, required: false, description: 'View details for a specific command' },
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
