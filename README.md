[<img src="https://s3.amazonaws.com/chronologic.network/ChronoLogic_logo.svg" width="128px">](https://github.com/chronologic)

[![npm version](https://badge.fury.io/js/eac.js-cli.svg)](https://badge.fury.io/js/eac.js-client)

[![Greenkeeper badge](https://badges.greenkeeper.io/ethereum-alarm-clock/eac.js-cli.svg)](https://greenkeeper.io/)

# EAC.JS-CLI

This package allows you to run an [Ethereum Alarm Clock](https://github.com/ethereum-alarm-clock/ethereum-alarm-clock) TimeNode and to schedule transactions. It contains testing utilties too. 

## Contribute

If you would like to hack on EAC.JS or notice a bug, please open an issue or come find us on the Ethereum Alarm Clock Gitter channel and tell us. If you're feeling more ambitious and would like to contribute directly via a pull request, that's cool too. We will review all pull requests and issues opened on this repository. Even if you think something isn't working right or that it should work another way, we would really appreciate if you helped us by opening an issue!

## How to use

To run a TimeNode or schedule a transaction you will need to create a keystore. `eac.js-cli` contains some utilities to help out with this.

```
./bin/eac.js --createWallet
```

will guide you through the steps of creating a keystore.

```
./bin/eac.js --fundWallet <amt> --wallet <wallet_path> --password <string> --provider <path>
```

will send `<amt>` ether to each account in the passed in wallet from a **local unlocked account**. Notice, you must be running a local node with a **local unlocked account** to use this utility. Otherwise you can send ether to your wallet accounts in any other way.

If you ever get tired of running a TimeNode, you can drain the funds held in the wallet to an external account like so:

```
./bin/eac.js --drainWallet <target_address> --wallet <wallet_path> --password <string>
```

Once you have your wallet set up and funded, run a TimeNode with some default params like so:

```
./bin/eac.js -c --wallet <wallet_path> --password <string> --provider <path> --maxDeposit 1
```

Open up `~/.eac.log` for the output, I prefer to follow the output in a new screen:

```
tail -f ~/.eac.log
```

## Want more?

This package is a part of EAC.JS family ~
* [EAC.JS-LIB](https://github.com/ethereum-alarm-clock/eac.js-lib)
* [EAC.JS-CLIENT](https://github.com/ethereum-alarm-clock/eac.js-client)
* [EAC.JS-CLI](https://github.com/ethereum-alarm-clock/eac.js-cli)