const program = require('commander');

const walletHandle = (path, paths) => {
  paths.push(path);
  return paths;
}

program
  .version(require('../package.json').version)
  .option('--provider [string]', '', 'http://localhost:8545')
  .option('-n, --repeat [num]', '', 1)
  .option('--save', '', false)
  .option('--wallet [path]', '', walletHandle, [])
  .option('--password [string]', '')
  .parse(process.argv)

module.exports = program;