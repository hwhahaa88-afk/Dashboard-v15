const fs = require("fs");
const path = require("path");

const commandsList = [];
const commandsDir = path.join(__dirname, "commands");

if (fs.existsSync(commandsDir)) {
  const files = fs.readdirSync(commandsDir).filter(file => file.endsWith(".js"));
  for (const file of files) {
    delete require.cache[require.resolve(path.join(commandsDir, file))];
    const cmd = require(path.join(commandsDir, file));
    if (cmd && cmd.name) {
      commandsList.push(cmd);
    }
  }
}

module.exports = commandsList;
module.exports.commands = commandsList;
