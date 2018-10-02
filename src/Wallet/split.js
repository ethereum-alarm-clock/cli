const fs = require('fs');

const split = (target) => {
  const keystores = JSON.parse(fs.readFileSync(target));
  const keys = Object.keys(keystores);
  keys.forEach((key) => {
    const keystore = keystores[key];
    const { address } = keystore;
    if (address) {
      const fileName = `UTC--${new Date().toISOString()}--${address}`;
      fs.writeFileSync(fileName, JSON.stringify(keystore));
    }
  });
};

module.exports = split;
