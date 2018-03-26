[<img src="https://s3.amazonaws.com/chronologic.network/ChronoLogic_logo.svg" width="128px">](https://github.com/chronologic)

# Docker

Sample `Dockerfile` for running the `eac.js-cli` node with remote web3 provider

## Instructions

To create a docker image from the Dockerfile you need copy your wallet encrypted keystore `json` file to the root directory.

update the wallet file name in the `Dockerfile`on `L#8` and `L#13`
  
Next step is to run docker build command

`docker build . -t eac.js-cli`

Next running docker image

`docker run -it -e PASSWORD={PASSWORD} -e PROVIDER={PROVIDER} eac.js-cli`


where

+ `{PASSWORD}` is a password used to encrypt wallet keystore file
+ `{PROVIDER}` is an url address of web3 provider *note: `eac.js-cli` relies on web3 node that exposes txpool API, currently the recommender client is **parity 1.8.9*** 