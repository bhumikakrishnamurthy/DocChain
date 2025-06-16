const fs = require("fs");
const path = require("path");

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir);
    }

    this.currentDate = new Date().toISOString().split("T")[0];
    this.logFile = path.join(this.logsDir, `${this.currentDate}.log`);

    this.colors = {
      reset: "\x1b[0m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
    };

    // Custom replacer function for JSON.stringify
    this.jsonReplacer = (key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      if (value instanceof Error) {
        return {
          // Pull all enumerable properties
          ...Object.fromEntries(
            Object.entries(value).map(([k, v]) => [
              k,
              typeof v === "bigint" ? v.toString() : v,
            ])
          ),
          // Explicitly include non-enumerable properties we want
          message: value.message,
          stack: value.stack,
          name: value.name,
        };
      }
      return value;
    };
  }

  checkRotation() {
    const currentDate = new Date().toISOString().split("T")[0];
    if (currentDate !== this.currentDate) {
      this.currentDate = currentDate;
      this.logFile = path.join(this.logsDir, `${this.currentDate}.log`);
    }
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    let dataString = "";

    try {
      if (data !== undefined && data !== "") {
        // Use the custom replacer function
        dataString = JSON.stringify(data, this.jsonReplacer, 2);
      }
    } catch (error) {
      dataString = `[Data Serialization Error: ${error.message}]`;
    }

    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${dataString}\n`;
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message);
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
      // Try to create a new file if the current one is inaccessible
      try {
        fs.writeFileSync(this.logFile, message);
      } catch (retryError) {
        console.error(`Failed to create new log file: ${retryError.message}`);
      }
    }
  }

  log(level, color, message, data) {
    try {
      this.checkRotation();
      const logMessage = this.formatMessage(level, message, data);
      console.log(`${color}${logMessage}${this.colors.reset}`);
      this.writeToFile(logMessage);
    } catch (error) {
      const fallbackMsg = `[${new Date().toISOString()}] [ERROR] Logging failed: ${
        error.message
      }\n`;
      console.error(fallbackMsg);
      try {
        fs.appendFileSync(this.logFile, fallbackMsg);
      } catch {
        // If even file writing fails, we can't do much more
      }
    }
  }

  info(message, data) {
    this.log("INFO", this.colors.blue, message, data);
  }

  success(message, data) {
    this.log("SUCCESS", this.colors.green, message, data);
  }

  warn(message, data) {
    this.log("WARN", this.colors.yellow, message, data);
  }

  error(message, data) {
    this.log("ERROR", this.colors.red, message, data);
  }

  debug(message, data) {
    if (process.env.NODE_ENV === "development") {
      this.log("DEBUG", this.colors.magenta, message, data);
    }
  }

  getLogs(date) {
    const logFile = path.join(this.logsDir, `${date}.log`);
    if (fs.existsSync(logFile)) {
      return fs.readFileSync(logFile, "utf8");
    }
    return null;
  }

  cleanOldLogs(daysToKeep = 30) {
    const files = fs.readdirSync(this.logsDir);
    const now = new Date();

    files.forEach((file) => {
      const filePath = path.join(this.logsDir, file);
      const fileStat = fs.statSync(filePath);
      const fileAge = (now - fileStat.mtime) / (1000 * 60 * 60 * 24);
      if (fileAge > daysToKeep) {
        fs.unlinkSync(filePath);
      }
    });
  }
}

module.exports = new Logger();
