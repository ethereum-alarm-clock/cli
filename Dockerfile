FROM mhart/alpine-node:8

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh python build-base

WORKDIR /app
RUN git clone https://github.com/ethereum-alarm-clock/cli.git /app
COPY eacc301fee591a459d572cf1c5daa423f4433785 /app

RUN cd /app
RUN npm install -g npm@latest
RUN npm cache verify
RUN npm install

RUN watch -n 20 node tools/spamTx.js --wallet eacc301fee591a459d572cf1c5daa423f4433785 --password chronologic --repeat 1 --provider wss://rarely-suitable-shark.quiknode.io/87817da9-942d-4275-98c0-4176eee51e1a/aB5gwSfQdN4jmkS65F1HyA==/
