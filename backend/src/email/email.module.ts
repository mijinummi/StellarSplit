import { Module, Global, OnModuleInit, Logger } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { EmailService } from "./email.service";
import { EmailProcessor } from "./email.processor";
import { EmailController } from "./email.controller";
import { User } from "../entities/user.entity";

export const EMAIL_TEMPLATE_FILES = [
  "completed",
  "confirmation",
  "invitation",
  "reminder",
] as const;

export const EMAIL_QUEUE_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    BullModule.registerQueue({
      name: "email_queue",
      defaultJobOptions: EMAIL_QUEUE_JOB_OPTIONS,
    }),
    BullModule.registerQueue({
      name: "email_queue_dead_letter",
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule implements OnModuleInit {
  private readonly logger = new Logger(EmailModule.name);

  onModuleInit(): void {
    const templatesDir = path.join(__dirname, "templates");

    for (const templateName of EMAIL_TEMPLATE_FILES) {
      const templatePath = path.join(templatesDir, `${templateName}.hbs`);
      try {
        fs.accessSync(templatePath, fs.constants.R_OK);
      } catch {
        throw new Error(
          `Email template missing at startup: ${templateName}.hbs (expected at ${templatePath})`,
        );
      }
    }

    this.logger.log(
      `Validated ${EMAIL_TEMPLATE_FILES.length} email templates in ${templatesDir}`,
    );
  }
}
