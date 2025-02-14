import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, align, errors } = format;

const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

// Custom format to uppercase the log level
const uppercaseLevel = format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});

const logger = createLogger({
  exitOnError: false,
  levels: logLevels,
  level: "trace", // Allows all logLevels to run
  format: combine(
    errors({ stack: true }), // Include stack traces for errors
    timestamp({ format: "MM-DD hh:mm:ss A" }), // Custom timestamp format
    uppercaseLevel(), // Ensure level is uppercase
    colorize({ all: true }), // Add color to the logs
    align(), // Align log output
    printf((info) => {
      // Cast info to the correct type to safely access message
      const { message, level, timestamp } = info as {
        message: string;
        level: string;
        timestamp: string;
      };

      const time = `[${timestamp}]`; // Highlight timestamp
      const cleanedMessage = message.replace(/[ \t]+/g, " ").trim(); // Clean message
      return `${time} ${level}: ${cleanedMessage}`; // Format log output
    }),
  ),
  transports: [new transports.Console()],
});

export { logger };
