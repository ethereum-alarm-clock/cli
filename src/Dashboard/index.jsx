import blessed from 'blessed';
import BigNumber from 'bignumber.js';

const helpText = `
Available Commands
------------------
.setLogLevel <num>  - Sets the logLevel to 1, 2, or 3 for DEBUG, INFO, or ERROR.
.start              - Starts the EXECUTIONG funcation of the TimeNode.
.startClaiming      - Starts the CLAIMING function of the TimeNode.
.startScroll        - Starts scroll-to-bottom for log output.
.stop               - Stops the TimeNode.
.stopClaiming       - Stops the CLAIMING function of the TimeNode.
.stopScroll         - Stops scroll-to-bottom for log output.`;

class Dashboard {
  constructor(timenode, options={}) {
    this.timenode = timenode;
    this.color = options.color || 'green';
    this.scrolling = options.scrolling || true;

    this.screen = blessed.screen({
      autoPadding: true,
      fullUnicode: true,
      smartCSR: true,
      title: 'TimeNode Dashboard',
    });  
    
    this.makeHeading();
    this.makeStats();
    this.makeNotifications();
    this.makeRepl();
    this.makeLogs();

    this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
      return process.exit(0);
    });

    this.screen.key('C-l', (ch, key) => {
      return this.input.focus();
    })

    this.screen.render();
    // this.input.focus();
  }

  makeHeading() {
    this.heading = blessed.box({
      label: "TimeNode Dashboard",
      border: {
        type: "line",
      },
      width: "60%",
      height: "10%",
      top: "0%",
      style: {
        border: {
          fg: this.color,
        },
      },
      content: `Network: ${this.timenode.config.chain.toUpperCase()}\nProvider: ${this.timenode.config.providerUrl}`,
    });

    this.screen.append(this.heading);
  }

  makeStats() {
    this.stats = blessed.box({
      label: "Stats",
      border: {
        type: "line"
      },
      width: "60%",
      height: "52%",
      top: "10%",
      style: {
        border: {
          fg: this.color,
        }
      }
    });

    const { config } = this.timenode;
    const timenodeAddresses = config.wallet.getAddresses();

    const updateRows = () => {
      const rows = timenodeAddresses.map((address) => {
          const bounties = config.statsDb.totalBounty(address);
          const costs = config.statsDb.totalCost(address);
          const profit = bounties.minus(costs);
    
          const formatWeiToEther = wei => config.web3.fromWei(wei, 'ether').toFixed(6);
    
          return [
            address,
            `${config.statsDb.getDiscovered(address).length}`,
            `${formatWeiToEther(profit)}`,
            `${config.statsDb.getSuccessfulExecutions(address).length} / ${config.statsDb.getFailedExecutions(address).length}`,
            `${config.statsDb.getSuccessfulClaims(address).length} / ${config.statsDb.getFailedClaims(address).length} / ${this.timenode.getClaimedNotExecutedTransactions()[address].length}`,
        ];
      });

      const formatWeiToEther = wei => config.web3.fromWei(wei, 'ether').toFixed(6);
      const shortenAddr = addr => `${addr.slice(0,8)}...${addr.slice(-4)}`;

      let i = 0;
      while (i < rows.length) {
        const curRow = rows[i];
        let j = 0;
        while (j < curRow.length) {
          const curItem = curRow[j];
          const address = curRow[0];
          const bounties = config.statsDb.totalBounty(address);
          const costs = config.statsDb.totalCost(address);

          let hoverText;
          let onClick;
          switch (j.toString()) {
            case '0':
              hoverText = curItem;
              onClick = () => this.notify('Address: ' + curItem);
              break;
            case '2': 
              hoverText = `(${formatWeiToEther(bounties)} bounties - ${formatWeiToEther(costs)} costs)`;
              break;
            case '3':
              hoverText = `${config.statsDb.getSuccessfulExecutions(address).length} successful | ${config.statsDb.getFailedExecutions(address).length} failed`;
              break;
            case '4':
              hoverText = `${config.statsDb.getSuccessfulClaims(address).length} claimed | ${config.statsDb.getFailedClaims(address).length} failed | ${this.timenode.getClaimedNotExecutedTransactions()[address].length} pending execution`;
              break;
            default:
              '';
              break;
          }

          blessed.box({
            parent: this.stats,
            clickable: true,
            input: true,
            tags: true,
            // border: {
            //   type: "line",
            // },
            width: "19.5%",
            height: "10%",
            top: `${(i+1)*10}%`,
            left: `${j*20}%`,
            content: `{center}${j === 0 ? shortenAddr(curItem): curItem}{/}`,
            style: {
              border: {
                fg: this.color,
              },
              hover: {
                fg: j === 1? '': 'green',
              },
            },
            mouse: true,
            hoverText,
          }).on('click', onClick);
          j++;
        }
        i++;
      }

      // const claiming = (a%2 === 0) ? "ON" : "OFF";
      const claiming = config.claiming ? "ON" : "OFF";
      const headerRow = [
        'Address',
        'Discovered',
        'Ether Profit/Loss',
        'Executions',
        `Claims (${claiming})`
      ];

      headerRow.forEach((item, idx) => {
        blessed.box({
          parent: this.stats,
          tags: true,
          // border: {
          //   type: "line"
          // },
          width: "19.5%",
          height: "10%",
          left: `${idx*20}%`,
          content: '{center}' + item + '{/}',
          style: {
            border: {
              fg: this.color,
            }
          }
        });
      });
      // this.screen.render();
    }

    updateRows();
    setInterval(() => {
      updateRows();
    }, 1500);

    this.screen.append(this.stats);
  }

  notify(msg) {
    this.notificationsText.add('{yellow-bg} ' + '{/} ' + msg);
  }

  makeNotifications() {
    this.notifications = blessed.box({
      label: "Notifications",
      left: "60%",
      width: "40%",
      height: "60%",
      border: {
        type: "line"
      },
      style: {
        border: {
          fg: this.color,
        }
      },
    });

    this.notificationsText = blessed.log({
      parent: this.notifications,
      tags: true,
      width: "98%",
      scrollable: true,
      input: false,
      alwaysScroll: false,
      style: {
        fg: '',
      }
    });

    this.screen.append(this.notifications);
  }

  makeRepl() {
    this.repl = blessed.box({
      label: "Repl",
      padding: 1,
      width: "60%",
      height: "36%",
      left: "0%",
      top: "60%",
      border: {
        type: "line"
      },
      style: {
        fg: -1,
        border: {
          fg: this.color,
        }
      }
    });

    this.infoText = blessed.log({
      parent: this.repl,
      tags: true,
      width: "98%",
      scrollable: true,
      input: false,
      alwaysScroll: false,
      mouse: true,
      scrollbar: {
        ch: " ",
        style: {
          bg: this.color,
        },
      },
    });

    this.console = blessed.box({
      label: 'Console',
      tags: true,
      padding: 0,
      width: '60%',
      height: '6%',
      left: '0%',
      top: '95%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: this.color,
        },
      },
    });

    this.input = blessed.textbox({
      parent: this.console,
      name: 'input',
      input: true,
      keys: false,
      top: 0,
      left: 1,
      height: '50%',
      width: '100%-4',
      mouse: true,
      inputOnFocus: true,
      style: {
        fg: this.color,
        // bg: 'black',
        focus: {
          // bg: 'black',
          fg: this.color,
        },
      },
      value: ">> "
    });


    this.input.key(["C-w"], function (ch, key) {
      self.input.clearValue();
      self.input.focus();
    });

    this.input.key(['escape', 'C-c'], function(ch, key) {
      return process.exit(0);
    });

    this.input.on("submit", this.submitCmd.bind(this));

    this.screen.append(this.repl);
    this.screen.append(this.console);
  }

  submitCmd(cmd) {
    this.infoText.add('\n' + cmd);
    this.respond(cmd);
    this.input.setValue('>> ');
    this.input.focus();
  }

  respondSuccess() {
    this.infoText.add('{red-fg}true{/}');
  }

  respond(cmd) {
    if (cmd.startsWith('>> ')) {
      cmd = cmd.slice(3);
    }
    if (cmd.slice(0, -2) === '.setLogLevel') {
      const level = parseInt(cmd.slice(-2), 10);
      if (level < 1 || level > 3) {
        this.infoText.add('Please set log level to "1" for DEBUG, "2" for INFO, or "3" for ERROR');
        return;
      }
      this.timenode.config.logger.logLevel = level;
      this.respondSuccess();
      const levels = ["DEBUG", "INFO", "ERROR"];
      this.notify('Log level changed to ' + levels[level-1]);
      return;
    }
    if (cmd === '.start') {
      this.timenode.startScanning();
      this.respondSuccess();
      this.notify('TimeNode STARTED');
      return;
    }
    if (cmd === '.startClaiming') {
      this.timenode.startClaiming();
      this.respondSuccess();
      this.notify('Claiming STARTED');
      return;
    }
    if (cmd === '.startScroll') {
      this.scrolling = true;
      this.infoText.add('{red-fg}true{/}');
      this.notify('Started scroll-to-bottom for log output.');
      return;
    }
    if (cmd === '.stop') {
      this.timenode.stopScanning();
      this.respondSuccess();
      this.notify('TimeNode STOPPED');
      return;
    }
    if (cmd === '.stopClaiming') {
      this.timenode.stopClaiming();
      this.respondSuccess();
      this.notify('Claiming STOPPED');
      return;
    }
    if (cmd === '.stopScroll') {
      this.scrolling = false;
      this.infoText.add('{red-fg}true{/}');
      this.notify('Stopped scroll-to-bottom for log output.');
      return;
    }
    // Doesn't match above.
    this.infoText.add(helpText);
  }

  makeLogs() {
    this.logs = blessed.box({
      label: "Logs",
      width: "40%",
      left: "60%",
      top: "60%",
      height: "40%",
      border: {
        type: "line"
      },
      style: {
        border: {
          fg: this.color
        }
      },
      mouse: true,
    });

    this.logText = blessed.box({
      parent: this.logs,
      tags: true,
      width: "98%",
      scrollable: true,
      // input: false,
      scrollOnInput: true,
      scrollback: 250,
      alwaysScroll: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        style: {
          bg: this.color,
        },
        // track: {
          // bg: 'green',
        // }
      },
      content: '',
    });

    this.screen.append(this.logs);
  }
}

module.exports = Dashboard;
