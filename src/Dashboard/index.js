'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _blessed = require('blessed');

var _blessed2 = _interopRequireDefault(_blessed);

var _bignumber = require('bignumber.js');

var _bignumber2 = _interopRequireDefault(_bignumber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var helpText = '\nAvailable Commands\n------------------\n.setLogLevel <num>  - Sets the logLevel to 1, 2, or 3 for DEBUG, INFO, or ERROR.\n.start              - Starts the EXECUTIONG funcation of the TimeNode.\n.startClaiming      - Starts the CLAIMING function of the TimeNode.\n.startScroll        - Starts scroll-to-bottom for log output.\n.stop               - Stops the TimeNode.\n.stopClaiming       - Stops the CLAIMING function of the TimeNode.\n.stopScroll         - Stops scroll-to-bottom for log output.';

var Dashboard = function () {
  function Dashboard(timenode) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Dashboard);

    this.timenode = timenode;
    this.color = options.color || 'green';
    this.scrolling = options.scrolling || true;

    this.screen = _blessed2.default.screen({
      autoPadding: true,
      fullUnicode: true,
      smartCSR: true,
      title: 'TimeNode Dashboard'
    });

    this.makeHeading();
    this.makeStats();
    this.makeNotifications();
    this.makeRepl();
    this.makeLogs();

    this.screen.key(['escape', 'q', 'C-c'], function (ch, key) {
      return process.exit(0);
    });

    this.screen.key('C-l', function (ch, key) {
      return _this.input.focus();
    });

    this.screen.render();
    // this.input.focus();
  }

  _createClass(Dashboard, [{
    key: 'makeHeading',
    value: function makeHeading() {
      this.heading = _blessed2.default.box({
        label: "TimeNode Dashboard",
        border: {
          type: "line"
        },
        width: "60%",
        height: "10%",
        top: "0%",
        style: {
          border: {
            fg: this.color
          }
        },
        content: 'Network: ' + this.timenode.config.chain.toUpperCase() + '\nProvider: ' + this.timenode.config.providerUrl
      });

      this.screen.append(this.heading);
    }
  }, {
    key: 'makeStats',
    value: function makeStats() {
      var _this2 = this;

      this.stats = _blessed2.default.box({
        label: "Stats",
        border: {
          type: "line"
        },
        width: "60%",
        height: "52%",
        top: "10%",
        style: {
          border: {
            fg: this.color
          }
        }
      });

      var config = this.timenode.config;

      var timenodeAddresses = config.wallet.getAddresses();

      var updateRows = function updateRows() {
        var rows = timenodeAddresses.map(function (address) {
          var bounties = config.statsDb.totalBounty(address);
          var costs = config.statsDb.totalCost(address);
          var profit = bounties.minus(costs);

          var formatWeiToEther = function formatWeiToEther(wei) {
            return config.web3.fromWei(wei, 'ether').toFixed(6);
          };

          return [address, '' + config.statsDb.getDiscovered(address).length, '' + formatWeiToEther(profit), config.statsDb.getSuccessfulExecutions(address).length + ' / ' + config.statsDb.getFailedExecutions(address).length, config.statsDb.getSuccessfulClaims(address).length + ' / ' + config.statsDb.getFailedClaims(address).length + ' / ' + _this2.timenode.getClaimedNotExecutedTransactions()[address].length];
        });

        var formatWeiToEther = function formatWeiToEther(wei) {
          return config.web3.fromWei(wei, 'ether').toFixed(6);
        };
        var shortenAddr = function shortenAddr(addr) {
          return addr.slice(0, 8) + '...' + addr.slice(-4);
        };

        var i = 0;
        while (i < rows.length) {
          var curRow = rows[i];
          var j = 0;

          var _loop = function _loop() {
            var curItem = curRow[j];
            var address = curRow[0];
            var bounties = config.statsDb.totalBounty(address);
            var costs = config.statsDb.totalCost(address);

            var hoverText = void 0;
            var onClick = void 0;
            switch (j.toString()) {
              case '0':
                hoverText = curItem;
                onClick = function onClick() {
                  return _this2.notify('Address: ' + curItem);
                };
                break;
              case '2':
                hoverText = '(' + formatWeiToEther(bounties) + ' bounties - ' + formatWeiToEther(costs) + ' costs)';
                break;
              case '3':
                hoverText = config.statsDb.getSuccessfulExecutions(address).length + ' successful | ' + config.statsDb.getFailedExecutions(address).length + ' failed';
                break;
              case '4':
                hoverText = config.statsDb.getSuccessfulClaims(address).length + ' claimed | ' + config.statsDb.getFailedClaims(address).length + ' failed | ' + _this2.timenode.getClaimedNotExecutedTransactions()[address].length + ' pending execution';
                break;
              default:
                '';
                break;
            }

            _blessed2.default.box({
              parent: _this2.stats,
              clickable: true,
              input: true,
              tags: true,
              // border: {
              //   type: "line",
              // },
              width: "19.5%",
              height: "10%",
              top: (i + 1) * 10 + '%',
              left: j * 20 + '%',
              content: '{center}' + (j === 0 ? shortenAddr(curItem) : curItem) + '{/}',
              style: {
                border: {
                  fg: _this2.color
                },
                hover: {
                  fg: j === 1 ? '' : 'green'
                }
              },
              mouse: true,
              hoverText: hoverText
            }).on('click', onClick);
            j++;
          };

          while (j < curRow.length) {
            _loop();
          }
          i++;
        }

        // const claiming = (a%2 === 0) ? "ON" : "OFF";
        var claiming = config.claiming ? "ON" : "OFF";
        var headerRow = ['Address', 'Discovered', 'Ether Profit/Loss', 'Executions', 'Claims (' + claiming + ')'];

        headerRow.forEach(function (item, idx) {
          _blessed2.default.box({
            parent: _this2.stats,
            tags: true,
            // border: {
            //   type: "line"
            // },
            width: "19.5%",
            height: "10%",
            left: idx * 20 + '%',
            content: '{center}' + item + '{/}',
            style: {
              border: {
                fg: _this2.color
              }
            }
          });
        });
        // this.screen.render();
      };

      updateRows();
      setInterval(function () {
        updateRows();
      }, 1500);

      this.screen.append(this.stats);
    }
  }, {
    key: 'notify',
    value: function notify(msg) {
      this.notificationsText.add('{yellow-bg} ' + '{/} ' + msg);
    }
  }, {
    key: 'makeNotifications',
    value: function makeNotifications() {
      this.notifications = _blessed2.default.box({
        label: "Notifications",
        left: "60%",
        width: "40%",
        height: "60%",
        border: {
          type: "line"
        },
        style: {
          border: {
            fg: this.color
          }
        }
      });

      this.notificationsText = _blessed2.default.log({
        parent: this.notifications,
        tags: true,
        width: "98%",
        scrollable: true,
        input: false,
        alwaysScroll: false,
        style: {
          fg: ''
        }
      });

      this.screen.append(this.notifications);
    }
  }, {
    key: 'makeRepl',
    value: function makeRepl() {
      this.repl = _blessed2.default.box({
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
            fg: this.color
          }
        }
      });

      this.infoText = _blessed2.default.log({
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
            bg: this.color
          }
        }
      });

      this.console = _blessed2.default.box({
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
            fg: this.color
          }
        }
      });

      this.input = _blessed2.default.textbox({
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
            fg: this.color
          }
        },
        value: ">> "
      });

      this.input.key(["C-w"], function (ch, key) {
        self.input.clearValue();
        self.input.focus();
      });

      this.input.key(['escape', 'C-c'], function (ch, key) {
        return process.exit(0);
      });

      this.input.on("submit", this.submitCmd.bind(this));

      this.screen.append(this.repl);
      this.screen.append(this.console);
    }
  }, {
    key: 'submitCmd',
    value: function submitCmd(cmd) {
      this.infoText.add('\n' + cmd);
      this.respond(cmd);
      this.input.setValue('>> ');
      this.input.focus();
    }
  }, {
    key: 'respondSuccess',
    value: function respondSuccess() {
      this.infoText.add('{red-fg}true{/}');
    }
  }, {
    key: 'respond',
    value: function respond(cmd) {
      if (cmd.startsWith('>> ')) {
        cmd = cmd.slice(3);
      }
      if (cmd.slice(0, -2) === '.setLogLevel') {
        var level = parseInt(cmd.slice(-2), 10);
        if (level < 1 || level > 3) {
          this.infoText.add('Please set log level to "1" for DEBUG, "2" for INFO, or "3" for ERROR');
          return;
        }
        this.timenode.config.logger.logLevel = level;
        this.respondSuccess();
        var levels = ["DEBUG", "INFO", "ERROR"];
        this.notify('Log level changed to ' + levels[level - 1]);
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
  }, {
    key: 'makeLogs',
    value: function makeLogs() {
      this.logs = _blessed2.default.box({
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
        mouse: true
      });

      this.logText = _blessed2.default.box({
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
            bg: this.color
          }
          // track: {
          // bg: 'green',
          // }
        },
        content: ''
      });

      this.screen.append(this.logs);
    }
  }]);

  return Dashboard;
}();

module.exports = Dashboard;