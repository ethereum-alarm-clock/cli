const Web3 = require('web3');

const initWeb3 = (provider) => {
    const p = (() => {
      if ( new RegExp('http://').test(provider) || new RegExp('https://').test(provider) ) {
        return new Web3.providers.HttpProvider(`${provider}`);
      } else if (new RegExp('ws://').test(provider) || new RegExp('wss://').test(provider) ) {
        const ws = new Web3WsProvider(`${provider}`);
        ws.__proto__.sendAsync = ws.__proto__.send;
        return ws;
      }
    })();
    
    return new Web3(p);
}

module.exports = initWeb3;