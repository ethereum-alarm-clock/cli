const fs = require('fs');

const split = (target) => {
  const keystores = JSON.parse(fs.readFileSync(target));
  for (const keystore of keystores) {
    const { address } = keystore;
    const fileName = 'UTC--' + new Date().toISOString() + '--' + address;
    fs.writeFileSync(fileName, JSON.stringify(keystore));
  }
}

module.exports = split;