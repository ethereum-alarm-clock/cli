FROM mhart/alpine-node:8

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh python build-base

WORKDIR /app
RUN git clone https://github.com/ethereum-alarm-clock/eac.js-cli.git /app
COPY wallet--79a92e6fe6baecf1e0a895d2d960e2321331697c /app

RUN cd /app
RUN npm install

CMD ["sh", "-c", "node cli/eac.js -c --logfile console --logLevel 2 -w wallet--79a92e6fe6baecf1e0a895d2d960e2321331697c -p ${PASSWORD} --provider ${PROVIDER}"]