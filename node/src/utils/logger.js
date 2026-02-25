import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger, transports, format } from 'winston';
import "winston-daily-rotate-file";

const { combine, timestamp, label, printf } = format;
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const myFormat = printf((info) => {
    let remainingArgs = info[Symbol.for("splat")] ?? []
    let structuredLogMessage;
    let logMessage;

    if (info.stack) {
        logMessage = `${info.message} \n ${info.stack}`
    } else {
        structuredLogMessage = remainingArgs.map((arg) => {
            if (typeof arg == "object") {
                return JSON.stringify(arg, null, 2)
            } else {
                return arg
            }
        })

        logMessage = [
            info.message,
            ...structuredLogMessage
        ].join(" ")
    }


    let color;
    switch (info.level) {
        case "debug":
            color = "\x1b[38;5;244m";
            break;
        case "info":
            color = "\x1b[38;5;39m";
            break;
        case "warn":
            color = "\x1b[38;5;214m";
            break;
        case "error":
            color = "\x1b[38;5;196m";
            break;
    }

    return `${color} ${info.timestamp} \n ${logMessage}`;
});

const logger = createLogger({
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.DailyRotateFile({
            level: "error",
            filename: path.join(__dirname, "..", "logs", "errorlog-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxFiles: 7
        }),
        new transports.DailyRotateFile({
            level: "debug",
            filename: path.join(__dirname, "..", "logs", "logfile-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxFiles: 7
        }),
        new transports.Console()
    ]
});

export default logger;