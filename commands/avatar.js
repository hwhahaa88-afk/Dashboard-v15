const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
  name: 'avatar',
  description: 'Displays user avatar or banner',
  options: [
    {
      name: 'user',
      type: ApplicationCommandOptionType.User,
      description: 'The user to fetch the avatar for',
      required: false,
    },
    {
      name: 'type',
      type: ApplicationCommandOptionType.String,
      description: 'avatar_type_description',
      required: false,
      choices: [
        { name: 'Server', value: 'server' },
        { name: 'Banner', value: 'banner' },
      ],
    },
  ],
  async execute(ctx) {
    try {
      const userOption = ctx.raw.options.getUser('user') || ctx.invoker;
      const typeOption = ctx.getString('type');

      // جلب بيانات العضو في السيرفر وبيانات المستخدم الكاملة لـ Banner
      const member = await ctx.guild.members.fetch(userOption.id).catch(() => null);
      const fetchedUser = await ctx.raw.client.users.fetch(userOption.id, { force: true }).catch(() => userOption);

      let imageURL = '';
      let titleText = 'Avatar';

      if (typeOption === 'server') {
        if (member && member.avatar) {
          imageURL = member.avatarURL({ dynamic: true, size: 1024 });
        } else {
          imageURL = userOption.displayAvatarURL({ dynamic: true, size: 1024 });
        }
        titleText = 'Server Avatar';
      } else if (typeOption === 'banner') {
        if (fetchedUser.banner) {
          imageURL = fetchedUser.bannerURL({ dynamic: true, size: 1024 });
          titleText = 'Banner';
        } else {
          return await ctx.reply({ content: `❌ | **${userOption.username}** does not have a banner.` });
        }
      } else {
        if (member && member.avatar) {
          titleText = 'Global & Server\nAvatar';
        } else {
          titleText = 'Avatar';
        }
        imageURL = userOption.displayAvatarURL({ dynamic: true, size: 1024 });
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: userOption.username,
          iconURL: userOption.displayAvatarURL({ dynamic: true }),
        })
        .setTitle('Avatar Link')
        .setURL(imageURL)
        .setDescription(`🌐 **${titleText}**`)
        .setImage(imageURL)
        .setThumbnail(imageURL)
        .setFooter({
          text: `Requested by ${ctx.invoker.username}`,
          iconURL: ctx.invoker.displayAvatarURL({ dynamic: true }),
        });

      await ctx.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Avatar command error:', err);
      await ctx.reply({ content: '❌ | Could not fetch avatar.' }).catch(() => null);
    }
  },
};
