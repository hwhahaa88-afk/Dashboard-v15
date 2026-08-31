with open('commands.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
found = False

for line in lines:
    if "name: 'clear'" in line or 'name: "clear"' in line:
        skip = True
        found = True
        # استبدال كامل لأمر clear بطريقة صحيحة ومباشرة
        new_lines.append("  {\n")
        new_lines.append("    name: 'clear',\n")
        new_lines.append("    description: 'Bulk delete messages (1-100) | حذف عدد من الرسائل',\n")
        new_lines.append("    permission: PermissionFlagsBits.ManageMessages,\n")
        new_lines.append("    options: [{ name: 'amount', type: 4, required: true, description: 'Number of messages to delete (1-100) | عدد الرسائل' }],\n")
        new_lines.append("    execute: async (ctx) => {\n")
        new_lines.append("      const rawAmount = ctx.getInteger ? ctx.getInteger('amount') : (ctx.options?.getInteger('amount') || 1);\n")
        new_lines.append("      const amount = Math.min(Math.max(parseInt(rawAmount) || 1, 1), 100);\n")
        new_lines.append("      const clearText = '```diff\\n+ ' + amount + ' messages have been deleted.\\n```';\n")
        new_lines.append("      if (ctx.isSlash) {\n")
        new_lines.append("        if (typeof ctx.raw?.deferReply === 'function') await ctx.raw.deferReply({ ephemeral: true }).catch(() => {});\n")
        new_lines.append("        else if (typeof ctx.deferReply === 'function') await ctx.deferReply({ ephemeral: true }).catch(() => {});\n")
        new_lines.append("        await ctx.channel.bulkDelete(amount, true).catch(() => {});\n")
        new_lines.append("        if (typeof ctx.raw?.editReply === 'function') {\n")
        new_lines.append("          await ctx.raw.editReply(clearText).catch(() => {});\n")
        new_lines.append("          setTimeout(() => ctx.raw.deleteReply().catch(() => {}), 1500);\n")
        new_lines.append("        } else if (typeof ctx.editReply === 'function') {\n")
        new_lines.append("          await ctx.editReply(clearText).catch(() => {});\n")
        new_lines.append("          setTimeout(() => ctx.deleteReply().catch(() => {}), 1500);\n")
        new_lines.append("        }\n")
        new_lines.append("      } else {\n")
        new_lines.append("        await ctx.channel.bulkDelete(amount, true).catch(() => {});\n")
        new_lines.append("        const msg = await ctx.reply(clearText).catch(() => {});\n")
        new_lines.append("        if (msg?.delete) setTimeout(() => msg.delete().catch(() => {}), 1500);\n")
        new_lines.append("      }\n")
        new_lines.append("    },\n")
        new_lines.append("  },\n")
        continue

    if skip:
        if "}," in line or line.strip() == "}":
            skip = False
        continue

    new_lines.append(line)

if found:
    with open('commands.js', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("✅ commands.js fixed successfully!")
else:
    print("❌ Clear command not found in commands.js")
