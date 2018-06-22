const program = require('commander');

program
  .version(require('../package.json').version)
  .option('--provider [string]', '', 'http://localhost:8545')
  .option('-n, --repeat [num]', '', 1)
  .option('--save', '', false)
  .option('--wallet [path]', '', [])
  .option('--password [string]', '')
  .parse(process.argv)

module.exports = program;