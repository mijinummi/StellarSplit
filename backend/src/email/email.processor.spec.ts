import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { getQueueToken } from "@nestjs/bull";
import { EmailProcessor } from "./email.processor";
import { EmailService } from "./email.service";
import { User } from "../entities/user.entity";

describe("EmailProcessor", () => {
  let processor: EmailProcessor;
  let userRepository: any;
  let emailService: any;
  let deadLetterQueue: any;

  beforeEach(async () => {
    emailService = {
      sendTemplatedEmail: jest.fn().mockResolvedValue(undefined),
    };

    userRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    deadLetterQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          provide: getQueueToken("email_queue_dead_letter"),
          useValue: deadLetterQueue,
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  it("should send an email if user exists and preferences allow it", async () => {
    const job = {
      id: "1",
      data: {
        to: "test@example.com",
        type: "invitation",
        context: { inviterName: "John" },
      },
    } as any;

    const mockUser = {
      id: "user1",
      email: "test@example.com",
      emailPreferences: { invitations: true },
      lastEmailSentAt: null,
    };

    userRepository.findOne.mockResolvedValue(mockUser);

    await processor.handleSendEmail(job);

    expect(emailService.sendTemplatedEmail).toHaveBeenCalledWith(
      "test@example.com",
      "invitation",
      { inviterName: "John" },
    );
    expect(userRepository.update).toHaveBeenCalledWith("user1", {
      lastEmailSentAt: expect.any(Date),
    });
  });

  it("should not send an email if rate limit is exceeded", async () => {
    const job = {
      id: "1",
      data: {
        to: "test@example.com",
        type: "invitation",
        context: {},
      },
    } as any;

    const mockUser = {
      id: "user1",
      email: "test@example.com",
      lastEmailSentAt: new Date(Date.now() - 30000),
    };

    userRepository.findOne.mockResolvedValue(mockUser);

    await processor.handleSendEmail(job);

    expect(emailService.sendTemplatedEmail).not.toHaveBeenCalled();
  });

  it("should not send an email if user disabled that type", async () => {
    const job = {
      id: "1",
      data: {
        to: "test@example.com",
        type: "invitation",
        context: {},
      },
    } as any;

    const mockUser = {
      id: "user1",
      email: "test@example.com",
      emailPreferences: { invitations: false },
      lastEmailSentAt: null,
    };

    userRepository.findOne.mockResolvedValue(mockUser);

    await processor.handleSendEmail(job);

    expect(emailService.sendTemplatedEmail).not.toHaveBeenCalled();
  });

  it("should route exhausted jobs to the dead-letter queue", async () => {
    const job = {
      id: "42",
      name: "sendEmail",
      data: { to: "fail@example.com", type: "invitation", context: {} },
      attemptsMade: 3,
      opts: { attempts: 3 },
      queue: { name: "email_queue" },
    } as any;

    const err = new Error("SMTP connection refused");

    await processor.onFailed(job, err);

    expect(deadLetterQueue.add).toHaveBeenCalledWith(
      "sendEmail",
      expect.objectContaining({
        jobId: "42",
        error: expect.objectContaining({ message: "SMTP connection refused" }),
      }),
      expect.objectContaining({
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      }),
    );
  });

  it("should not route to dead-letter queue when retries remain", async () => {
    const job = {
      id: "42",
      name: "sendEmail",
      data: { to: "fail@example.com", type: "invitation", context: {} },
      attemptsMade: 1,
      opts: { attempts: 3 },
      queue: { name: "email_queue" },
    } as any;

    await processor.onFailed(job, new Error("transient failure"));

    expect(deadLetterQueue.add).not.toHaveBeenCalled();
  });
});
