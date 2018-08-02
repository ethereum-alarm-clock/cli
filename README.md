[<img src="https://s3.amazonaws.com/chronologic.network/ChronoLogic_logo.svg" width="128px">](https://github.com/chronologic)

[![npm version](https://badge.fury.io/js/%40ethereum-alarm-clock%2Fcli.svg)](https://badge.fury.io/js/%40ethereum-alarm-clock%2Fcli)
[![Greenkeeper badge](https://badges.greenkeeper.io/ethereum-alarm-clock/cli.svg)](https://greenkeeper.io/)

# @ethereum-alarm-clock/cli

This package allows you to run an [Ethereum Alarm Clock](https://github.com/ethereum-alarm-clock/ethereum-alarm-clock) TimeNode and to schedule transactions. It contains testing utilties too. 

## Contribute

If you would like to hack on `@ethereum-alarm-clock/cli` or notice a bug, please open an issue or come find us on the Ethereum Alarm Clock Gitter channel and tell us. If you're feeling more ambitious and would like to contribute directly via a pull request, that's cool too. We will review all pull requests and issues opened on this repository. Even if you think something isn't working right or that it should work another way, we would really appreciate if you helped us by opening an issue!

## How to use

Install the binary from NPM by typing `npm i -g @ethereum-alarm-clock/cli` and hitting enter.

To run a TimeNode or schedule a transaction you will need to create a keystore. `eac` contains some utilities to help out with this.

```
eac createWallet
```

will guide you through the steps of creating a keystore.

```
eac fundWallet <amt> --wallet <wallet_path> --password <string> --provider <path>
```

will send `<amt>` ether to each account in the passed in wallet from a **local unlocked account**. Notice, you must be running a local node with a **local unlocked account** to use this utility. Otherwise you can send ether to your wallet accounts in any other way.

If you ever get tired of running a TimeNode, you can drain the funds held in the wallet to an external account like so:

```
eac drainWallet <target_address> --wallet <wallet_path> --password <string>
```

Once you have your wallet set up and funded, run a TimeNode with some default params like so: (`provider` is the path to the Ethereum node you are using)

```
eac timenode --wallet <wallet_path> --password <string> --provider <path> --maxDeposit 1
```

Open up `~/.eac.log` for the output, I prefer to follow the output in a new screen:

```
tail -f ~/.eac.log
```

## Want more?

This package is a part of EAC.JS family ~
* [EAC.JS-LIB](https://github.com/ethereum-alarm-clock/eac.js-lib)
* [timenode-core](https://github.com/ethereum-alarm-clock/timenode-core)
* [cli](https://github.com/ethereum-alarm-clock/cli)
