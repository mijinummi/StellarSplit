import { Process, Processor, OnQueueFailed, InjectQueue } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { EmailService } from "./email.service";
import {
  logJobFailure,
  routeToDeadLetter,
} from "../common/queue-job-policy";

@Processor("email_queue")
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    @InjectQueue("email_queue_dead_letter")
    private readonly deadLetterQueue: Queue,
  ) {}

  @Process({
    name: "sendEmail",
    concurrency: 1,
  })
  async handleSendEmail(job: Job<any>) {
    const { to, type, context } = job.data;

    this.logger.log(`Processing email job ${job.id} of type ${type} to ${to}`);

    try {
      const user = await this.userRepository.findOne({ where: { email: to } });

      if (user) {
        if (
          user.lastEmailSentAt &&
          Date.now() - user.lastEmailSentAt.getTime() < 60000
        ) {
          this.logger.warn(
            `Rate limit exceeded for user ${to}. Skipping email.`,
          );
          return;
        }

        const preferences = user.emailPreferences;
        const preferenceKeyMap: Record<string, keyof typeof preferences> = {
          invitation: "invitations",
          reminder: "reminders",
          confirmation: "receivedConfirmation",
          completed: "completion",
        };

        if (preferenceKeyMap[type] && !preferences[preferenceKeyMap[type]]) {
          this.logger.log(`User ${to} has disabled ${type} emails. Skipping.`);
          return;
        }
      }

      await this.emailService.sendTemplatedEmail(to, type, context);

      if (user) {
        await this.userRepository.update(user.id, {
          lastEmailSentAt: new Date(),
        });
      }

      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error: unknown) {
      logJobFailure(this.logger, job, error, { context: "email-send" });
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error): Promise<void> {
    logJobFailure(this.logger, job, err, { context: "email-dead-letter" });

    const maxAttempts = job.opts.attempts ?? 3;
    if (job.attemptsMade >= maxAttempts) {
      await routeToDeadLetter(
        {
          add: (name, data, opts) =>
            this.deadLetterQueue.add(name, data, opts as object),
        },
        job,
        err,
      );
    }
  }
}
