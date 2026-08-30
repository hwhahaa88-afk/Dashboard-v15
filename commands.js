const { PermissionFlagsBits } = require("discord.js");

function r(emoji, text) {
  return `${emoji} | ${text}`;
}

const commands = [
  {
    name: "vmove",
    description: "Move a member to another voice channel | نقل عضو لروم صوتي آخر",
    permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: "user", type: "user", required: true, description: "The member to move" },
      { name: "channel", type: "channel", required: false, description: "Target voice channel (optional)" }
    ],
    execute: async (interaction) => {
      try {
        if (interaction.deferReply) await interaction.deferReply({ ephemeral: true }).catch(() => {});

        const targetUser = interaction.options?.getUser("user") || interaction.targetUser;
        const channelOpt = interaction.options?.getChannel("channel");

        if (!targetUser) {
          const msg = r("❌", "Member not found.");
          return interaction.editReply ? interaction.editReply(msg) : interaction.reply(msg);
        }

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member || !member.voice || !member.voice.channel) {
          const msg = r("❌", "Member is not in a voice channel.");
          return interaction.editReply ? interaction.editReply(msg) : interaction.reply(msg);
        }

        let targetChannel = channelOpt;
        if (!targetChannel) {
          const invokerMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
          targetChannel = invokerMember?.voice?.channel;
        }

        if (!targetChannel || !targetChannel.isVoiceBased()) {
          const msg = r("❌", "Please specify a valid voice channel option or join a voice channel first.");
          return interaction.editReply ? interaction.editReply(msg) : interaction.reply(msg);
        }

        await member.voice.setChannel(targetChannel);
        const successMsg = r("✅", "**" + (member.user.username || member.displayName) + "** has been moved to <#" + targetChannel.id + ">!");
        return interaction.editReply ? interaction.editReply(successMsg) : interaction.reply(successMsg);
      } catch (err) {
        console.error(err);
        const errorMsg = r("❌", "An error occurred while moving the member.");
        return interaction.editReply ? interaction.editReply(errorMsg) : interaction.reply(errorMsg);
      }
    }
  }
];

module.exports = commands;
