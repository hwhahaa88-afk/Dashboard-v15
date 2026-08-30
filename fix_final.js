const fs = require('fs');

let fileStr = fs.readFileSync('commands.js', 'utf8');

// البحث عن أمر vmove كاملاً من بدايته إلى نهاية كائن الأمر
const pattern = /\{\s*name:\s*['"]vmove['"][\s\S]*?execute:\s*async\s*\(ctx\)\s*=>\s*\{[\s\S]*?\n\s*\},/;\n
const newVmove = `  {
    name: 'vmove',
    description: 'Move a member to another voice channel | نقل عضو لروم صوتي آخر',
    permission: PermissionFlagsBits.MoveMembers,
    options: [
      { name: 'user', type: 'user', required: true, description: 'The member to move' },
      { name: 'channel', type: 'channel', required: false, description: 'Target voice channel (optional)' },
    ],
    execute: async (ctx) => {
      const member = await ctx.getUserMember('user');
      if (!member) return ctx.reply(r('❌', 'Member not found.'));
      if (!member.voice || !member.voice.channel) return ctx.reply(r('❌', 'Member is not in a voice channel.'));

      let channel = ctx.getChannel('channel');
      if (!channel) {
        const invokerMember = await ctx.guild.members.fetch(ctx.invoker.id).catch(() => null);
        channel = invokerMember?.voice?.channel;
      }

      if (!channel || !channel.isVoiceBased()) {
        return ctx.reply(r('❌', 'You must specify a valid voice channel or be in one yourself.'));
      }

      await member.voice.setChannel(channel);
      return ctx.reply(r('✅', '**' + (member.user.username || member.displayName) + '** has been moved to <#' + channel.id + '>!'));
    },
  },`;

if (pattern.test(fileStr)) {
  fileStr = fileStr.replace(pattern, newVmove);
} else {
  // إذا لم يطابق الباترن، استبدل من اسم الأمر مباشرة
  const vPos = fileStr.indexOf("name: 'vmove'");
  if (vPos !== -1) {
    const startObj = fileStr.lastIndexOf('{', vPos);
    let count = 0;
    let endObj = -1;
    for (let i = startObj; i < fileStr.length; i++) {
      if (fileStr[i] === '{') count++;
      else if (fileStr[i] === '}') count--;
      if (count === 0) {
        endObj = i + 1;
        if (fileStr[endObj] === ',') endObj++;
        break;
      }
    }
    if (endObj !== -1) {
      fileStr = fileStr.slice(0, startObj) + newVmove + fileStr.slice(endObj);
    }
  }
}

fs.writeFileSync('commands.js', fileStr);
console.log('✅ Replaced successfully!');
