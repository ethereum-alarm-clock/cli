const fs = require("fs")

class FileLogger {

  constructor(logFile, logLevel) {
    if (logFile === "console") {
      this.logToFile = false;
    } else {
      this.logToFile = true;
      this.logFile = logFile;
      let i = 1;
      while (fs.existsSync(this.logFile)) {
        this.logFile = logFile + '.' + i.toString();
        i++;
      }
      fs.writeFileSync(this.logFile, "\n");
    }
    this.logLevel = logLevel;
  }

  debug(msg, address = '') {
    if (this.logLevel > 1) {
      return;
    }
    this.formatPrint('DEBUG', msg, address);
  }

  error(msg, address = '') {
    this.formatPrint('ERROR', msg, address);
  }

  info(msg, address = '') {
    if (this.logLevel > 2) {
      return;
    }
    this.formatPrint('INFO', msg, address);
  }

  formatPrint(kind, msg, address = '') {
    const txRequest = address ? ` [${address}]` : '';
    const stringToLog = `${this.now()} [${kind}]${txRequest} ${msg}`;
    if (this.logToFile) {
      fs.appendFileSync(this.logFile, stringToLog + "\n");
    } else {
      console.log(stringToLog);
    }
  }

  now() {
    return new Date().toISOString();
  }
}

module.exports = FileLogger;