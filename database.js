const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, 'database.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  prefix TEXT DEFAULT '-'
);

CREATE TABLE IF NOT EXISTS warnings (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS points (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS automod_settings (
  guild_id TEXT PRIMARY KEY,
  anti_link INTEGER NOT NULL DEFAULT 0,
  anti_spam INTEGER NOT NULL DEFAULT 0,
  anti_badwords INTEGER NOT NULL DEFAULT 0,
  anti_caps INTEGER NOT NULL DEFAULT 0,
  anti_mentions INTEGER NOT NULL DEFAULT 0,
  punishment TEXT NOT NULL DEFAULT 'delete',
  exempt_channels TEXT NOT NULL DEFAULT '[]',
  exempt_roles TEXT NOT NULL DEFAULT '[]'
);
`);

function getPrefix(guildId) {
  const row = db.prepare('SELECT prefix FROM guild_settings WHERE guild_id = ?').get(guildId);
  return row ? row.prefix : '-';
}

function setPrefix(guildId, prefix) {
  db.prepare(`
    INSERT INTO guild_settings (guild_id, prefix) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET prefix = excluded.prefix
  `).run(guildId, prefix);
}

function getWarnings(guildId, userId) {
  return db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY date ASC').all(guildId, userId);
}

function addWarning(guildId, userId, reason, moderatorId) {
  const warning = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    guild_id: guildId,
    user_id: userId,
    reason,
    moderator_id: moderatorId,
    date: new Date().toISOString(),
  };
  db.prepare(`
    INSERT INTO warnings (id, guild_id, user_id, reason, moderator_id, date)
    VALUES (@id, @guild_id, @user_id, @reason, @moderator_id, @date)
  `).run(warning);
  return warning;
}

function removeWarning(guildId, userId, warnId) {
  const result = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ? AND id = ?').run(guildId, userId, warnId);
  return result.changes > 0;
}

function clearWarnings(guildId, userId) {
  const result = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  return result.changes;
}

function getPoints(guildId, userId) {
  const row = db.prepare('SELECT amount FROM points WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  return row ? row.amount : 0;
}

function addPoints(guildId, userId, amount) {
  const total = getPoints(guildId, userId) + amount;
  db.prepare(`
    INSERT INTO points (guild_id, user_id, amount) VALUES (?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET amount = excluded.amount
  `).run(guildId, userId, total);
  return total;
}

const DEFAULT_AUTOMOD = {
  anti_link: false,
  anti_spam: false,
  anti_badwords: false,
  anti_caps: false,
  anti_mentions: false,
  punishment: 'delete',
  exempt_channels: [],
  exempt_roles: [],
};

function getAutomodSettings(guildId) {
  const row = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guildId);
  if (!row) return { guild_id: guildId, ...DEFAULT_AUTOMOD };
  return {
    guild_id: guildId,
    anti_link: !!row.anti_link,
    anti_spam: !!row.anti_spam,
    anti_badwords: !!row.anti_badwords,
    anti_caps: !!row.anti_caps,
    anti_mentions: !!row.anti_mentions,
    punishment: row.punishment,
    exempt_channels: JSON.parse(row.exempt_channels || '[]'),
    exempt_roles: JSON.parse(row.exempt_roles || '[]'),
  };
}

function updateAutomodSettings(guildId, partial) {
  const merged = { ...getAutomodSettings(guildId), ...partial };
  db.prepare(`
    INSERT INTO automod_settings (guild_id, anti_link, anti_spam, anti_badwords, anti_caps, anti_mentions, punishment, exempt_channels, exempt_roles)
    VALUES (@guild_id, @anti_link, @anti_spam, @anti_badwords, @anti_caps, @anti_mentions, @punishment, @exempt_channels, @exempt_roles)
    ON CONFLICT(guild_id) DO UPDATE SET
      anti_link = excluded.anti_link, anti_spam = excluded.anti_spam,
      anti_badwords = excluded.anti_badwords, anti_caps = excluded.anti_caps,
      anti_mentions = excluded.anti_mentions, punishment = excluded.punishment,
      exempt_channels = excluded.exempt_channels, exempt_roles = excluded.exempt_roles
  `).run({
    guild_id: guildId,
    anti_link: merged.anti_link ? 1 : 0,
    anti_spam: merged.anti_spam ? 1 : 0,
    anti_badwords: merged.anti_badwords ? 1 : 0,
    anti_caps: merged.anti_caps ? 1 : 0,
    anti_mentions: merged.anti_mentions ? 1 : 0,
    punishment: merged.punishment,
    exempt_channels: JSON.stringify(merged.exempt_channels || []),
    exempt_roles: JSON.stringify(merged.exempt_roles || []),
  });
  return getAutomodSettings(guildId);
}

module.exports = {
  db, getPrefix, setPrefix,
  getWarnings, addWarning, removeWarning, clearWarnings,
  getPoints, addPoints,
  getAutomodSettings, updateAutomodSettings,
};
