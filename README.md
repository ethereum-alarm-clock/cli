[<img src="https://s3.amazonaws.com/chronologic.network/ChronoLogic_logo.svg" width="128px">](https://github.com/chronologic)

_Note: `eac.js` is operational but still considered alpha software, released to the public for expirmentation and testing. We do not recommend using it on the mainnet as it will lose you money under certain situations._ 

[![npm version](https://badge.fury.io/js/eac.js-cli.svg)](https://badge.fury.io/js/eac.js-cli)
# eac.js-cli

This is a part of eac.js family that includes 
* [eac.js-lib](https://github.com/ethereum-alarm-clock/eac.js-lib)
* [eac.js-client](https://github.com/ethereum-alarm-clock/eac.js-client)
* [eac.js-cli](https://github.com/ethereum-alarm-clock/eac.js-cli)

Eac.js-cli is the command line tool that allows you to schedule transactions or run a timenode 
on the Ethereum Alarm Clock protocol.

## Running
Download this repository locally using `git clone` and install packages from NPM:

```
git clone git@github.com:ethereum-alarm-clock/eac.js-cli.git
cd eac.jc-cli
npm i
```

You will need to install and run the latest version of the Parity client on the __kovan__
network. Make sure to follow the steps to unlock a local account.

After starting up your Parity node, you can start the execution client (Timenode)
by using the `-c` option. This will use your default unlocked account as the account
from which to begin executing transactions from.

```
node bin/eac.js -c
```

You can install globablly from NPM:

install globally: `npm i -g eac.js-cli`  
run from command line: `eac.js -c`  
view options: `eac.js --h`

### Docker
[ Instructions ](https://github.com/ethereum-alarm-clock/eac.js-cli/tree/docker-setup)

## Testing

Install mocha `npm i -g mocha` and `mocha` at the root of the directory to run the test script on an isolated virtual blockchain using mocha. 

## Contributing

Pull requests are always welcome. Not all functionalities of the Ethereum Alarm Clock smart contracts are translated to this library, it was mostly just utilities needed to write the client and grew from there. If you need some functionality and are not finding it in the API docs, please open a issue or contribute a pull request.

## Questions or Concerns?

Since this is alpha software, we highly encourage you to test it, use it and try to break it. We would love your feedback if you get stuck somewhere or you think something is not working the way it should be. Please open an issue if you need to report a bug or would like to leave a suggestion. Pull requests are welcome.
