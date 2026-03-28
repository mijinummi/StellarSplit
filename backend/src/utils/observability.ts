import winston from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export function logDelivery(url: string, status: string, attempt: number, error?: string) {
  logger.info({
    event: "webhook_delivery",
    url,
    status,
    attempt,
    error,
    timestamp: new Date().toISOString(),
  });
}
