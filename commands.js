const { PermissionFlagsBits, ChannelType } = require('discord.js');
const msLib = require('ms');
const { getWarnings, addWarning, removeWarning, clearWarnings, getPoints, addPoints } = require('./database');
const { buildMainHelpEmbed, buildCategoryEmbed, buildCommandDetailEmbed, buildHelpSelectRow } = require('./helpHelper');

async function fetchUserSafely(client, userId) {
  try {
    return await client.users.fetch(userId);
  } catch {
    return null;
  }
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
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
    options: [
      { name: 'user_id', type: 3, required: true, description: 'The user ID to ban (or mention in text command)' },
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

      let targetUser = await fetchUserSafely(ctx.client, userId);
      const displayName = targetUser ? targetUser.username : userId;

      const reason = ctx.isSlash ? (ctx.raw.options.getString('reason') || 'No reason provided') : (ctx.args[1] || 'No reason provided');
      let bulk = ctx.isSlash ? (ctx.raw.options.getInteger('bulk') || 0) : 0;
      bulk = Math.min(Math.max(bulk, 0), 7);
      const time = ctx.isSlash ? ctx.raw.options.getString('time') : null;

      try {
        if (targetUser) {
          const member = await ctx.guild.members.fetch(userId).catch(() => null);
          if (member) {
            if (member.permissions.has(PermissionFlagsBits.Administrator)) {
              return ctx.reply({ content: "❌ | You cannot ban an administrator.", ephemeral: true });
            }
            if (member.id === ctx.client.user.id) {
              return ctx.reply({ content: "❌ | I cannot ban myself.", ephemeral: true });
            }
          }
        }

        await ctx.guild.bans.create(userId, { reason, deleteMessageSeconds: bulk * 86400 });

        let replyMessage = `✅ | **${displayName}** has been successfully banned from the server!`;
        if (time) {
          const msDuration = parseDuration(time);
          if (msDuration && msDuration > 0) {
            replyMessage += ` \nDuration: ${time}`;
            scheduleTempUnban(ctx.guild, userId, msDuration);
          }
        }
        if (reason !== 'No reason provided') {
          replyMessage += ` \nReason: ${reason}`;
        }

        return ctx.reply(replyMessage);
      } catch (error) {
        if (error.code === 50013) {
          return ctx.reply({ content: "❌ | I don't have permission to ban this user (missing permissions or hierarchy issue).", ephemeral: true });
        } else if (error.code === 10026) {
          return ctx.reply({ content: "❌ | This user is not in the server or already banned.", ephemeral: true });
        } else {
          return ctx.reply({ content: `❌ | Failed to ban user: ${error.message}`, ephemeral: true });
        }
      }
    }
  },
  {
    name: 'unban',
    description: 'Unban a user by ID',
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
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

      let targetUser = await fetchUserSafely(ctx.client, userId);
      const displayName = targetUser ? targetUser.username : userId;

      try {
        const banList = await ctx.guild.bans.fetch();
        const bannedUser = banList.get(userId);

        if (!bannedUser) {
          return ctx.reply({ content: "❌ | No ban found for this ID.", ephemeral: true });
        }

        await ctx.guild.bans.remove(userId, 'Unbanned via command');
        return ctx.reply(`✅ | **${displayName}** has been successfully unbanned!`);
      } catch (error) {
        if (error.code === 10026) {
          return ctx.reply({ content: "❌ | No ban found for this ID.", ephemeral: true });
        } else if (error.code === 50013) {
          return ctx.reply({ content: "❌ | I don't have permission to unban this user.", ephemeral: true });
        } else {
          return ctx.reply({ content: `❌ | Failed to unban user: ${error.message}`, ephemeral: true });
        }
      }
    }
  }
];

module.exports = { commands };
