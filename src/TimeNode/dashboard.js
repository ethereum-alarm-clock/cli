const BigNumber = require('bignumber.js');
const Table = require('cli-table2');

const Web3 = require('web3');

const chronologicQuikNodeHttpKovan = 'https://rarely-suitable-shark.quiknode.io/87817da9-942d-4275-98c0-4176eee51e1a/aB5gwSfQdN4jmkS65F1HyA==/';
const web3 = new Web3(new Web3.providers.HttpProvider(chronologicQuikNodeHttpKovan))

const makeDashboard = (config, timenode) => {
  const claiming = config.claiming ? 'ON' : 'OFF';

  // instantiate
  const dashboard = new Table({
    head: ['TimeNode Address', 'Discovered', 'Ether Gain', 'Executions', `Claims (${claiming})`],
    colWidths: [20, 12],
  });

  const timeNodeAddresses = config.wallet.getAddresses();
  const rows = timeNodeAddresses.map((address) => {
    const bounties = config.statsDb.totalBounty(address);
    const costs = config.statsDb.totalCost(address);
    const profit = bounties.minus(costs);

    const formatWeiToEther = wei => config.web3.fromWei(wei, 'ether').toFixed(6);

    return [
      address,
      `${config.statsDb.getDiscovered(address).length}`,
      `${formatWeiToEther(profit)} (${formatWeiToEther(bounties)} bounties - ${formatWeiToEther(costs)} costs)`,
      `${config.statsDb.getSuccessfulExecutions(address).length} successful, ${config.statsDb.getFailedExecutions(address).length} failed`,
      `${claiming}, ${config.statsDb.getSuccessfulClaims(address).length} claimed, ${config.statsDb.getFailedClaims(address).length} failed, ${timenode.getClaimedNotExecutedTransactions()[address].length} pending execution`,
    ];
  });

  rows.forEach(row => dashboard.push(row));
  return dashboard;
};

module.exports = makeDashboard;

const mockConfig = {
  statsDb: {
    getDiscovered: () => [
      'a',
      'b',
      'c',
    ],
    getFailedExecutions: () => [
      'a',
      'b',
      'c',
    ],
    getFailedClaims: () => [
      'a',
      'b',
      'c',
    ],
    getSuccessfulExecutions: () => [
      'a',
      'b',
      'c',
    ],
    getSuccessfulClaims: () => [
      'a',
      'b',
      'c',
    ],
    totalBounty: () => new BigNumber(32),
    totalCost: () => new BigNumber(11),
  },
  wallet: {
    getAddresses: () => [
      '0xD1CEeeefA68a6aF0A5f6046132D986066c7f9426',
      '0xD1CEeeefA68a6aF0A5f6046132D986066c7f9426',
      '0xD1CEeeefA68a6aF0A5f6046132D986066c7f9426',
    ],
  },
  web3,
};

const mockTimenode = {
  getClaimedNotExecutedTransactions: () => {
    return {
      '0xD1CEeeefA68a6aF0A5f6046132D986066c7f9426': [
        'a',
        'b',
        'c',
      ],
    };
  },
};

// console.log(mockTimenode.getClaimedNotExecutedTransactions());
console.log(makeDashboard(mockConfig, mockTimenode).toString());
