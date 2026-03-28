import { AppDataSource } from "../data-source";
import { WebhookDelivery } from "../entities/webhook.entity";

export const webhookRepo = AppDataSource.getRepository(WebhookDelivery);

export async function saveDelivery(delivery: Partial<WebhookDelivery>) {
  return webhookRepo.save(delivery);
}

export async function getDeliveryHistory(url: string) {
  return webhookRepo.find({ where: { webhookUrl: url }, order: { attemptedAt: "DESC" } });
}
