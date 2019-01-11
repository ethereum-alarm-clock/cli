const Table = require('cli-table2');

const makeDashboard = (config, timenode) => {
  const claiming = config.claiming ? 'ON' : 'OFF';

  // instantiate
  const dashboard = new Table({
    head: [
      { hAlign: 'center', content: 'TimeNode Address' },
      { hAlign: 'center', content: 'Discovered' },
      { hAlign: 'center', content: 'Ether Gain' },
      { hAlign: 'center', content: 'Executions' },
      { hAlign: 'center', content: `Claims (${claiming})` },
    ],
    colWidths: [20, 12],
  });

  const timeNodeAddresses = config.wallet.getAddresses();
  const rows = timeNodeAddresses.map((address) => {
    const bounties = config.statsDb.totalBounty(address);
    const costs = config.statsDb.totalCost(address);
    const profit = bounties.minus(costs);

    const formatWeiToEther = wei => config.web3.utils.fromWei(wei.toString(), 'ether');

    const shortenAddr = addr => `${addr.slice(0, 8)}...${addr.slice(-4)}`;

    return [
      { hAlign: 'center', content: shortenAddr(address) },
      { hAlign: 'center', content: `${config.statsDb.getDiscovered(address).length}` },
      `${formatWeiToEther(profit)} (${formatWeiToEther(bounties)} bounties - ${formatWeiToEther(costs)} costs)`,
      `${config.statsDb.getSuccessfulExecutions(address).length} successful | ${config.statsDb.getFailedExecutions(address).length} failed`,
      `${config.statsDb.getSuccessfulClaims(address).length} claimed | ${config.statsDb.getFailedClaims(address).length} failed | ${timenode.getClaimedNotExecutedTransactions()[address].length} pending execution`,
    ];
  });

  rows.forEach(row => dashboard.push(row));
  return dashboard;
};

module.exports = makeDashboard;
