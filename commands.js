const { PermissionFlagsBits } = require("discord.js");

function r(emoji, text) {
  return `**${emoji} | ${text}**`;
}

const commandsList = [
  {
    "name": "vmove",
    "description": "Move a member to another voice channel | نقل عضو لروم صوتي آخر",
    "permission": "MoveMembers",
    "options": [
      {
        "name": "user",
        "type": "user",
        "required": true,
        "description": "The member to move"
      },
      {
        "name": "channel",
        "type": "channel",
        "required": false,
        "description": "Target voice channel (optional)"
      }
    ]
  }
];

module.exports = commandsList;
module.exports.commands = commandsList;
