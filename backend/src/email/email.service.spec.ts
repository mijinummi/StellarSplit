import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bull";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";
import { User } from "../entities/user.entity";
import * as nodemailer from "nodemailer";
import * as fs from "fs";

jest.mock("nodemailer");
jest.mock("fs");

describe("EmailService", () => {
  let service: EmailService;
  let queue: any;
  let configService: any;
  let transporterMock: any;

  beforeEach(async () => {
    transporterMock = {
      sendMail: jest.fn().mockResolvedValue({ message: '{"to":"test@example.com"}' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(transporterMock);

    queue = {
      add: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: getQueueToken("email_queue"),
          useValue: queue,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            update: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should use jsonTransport when SMTP_HOST is unset", () => {
    configService.get.mockReturnValue(undefined);

    service.onModuleInit();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      jsonTransport: true,
    });
  });

  it("should configure SMTP transport when SMTP_HOST is set", () => {
    configService.get.mockImplementation((key: string, defaultVal?: unknown) => {
      const values: Record<string, unknown> = {
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: 587,
        SMTP_USER: "user",
        SMTP_PASSWORD: "pass",
      };
      return values[key] ?? defaultVal;
    });

    service.onModuleInit();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      auth: {
        user: "user",
        pass: "pass",
      },
    });
  });

  it("should add an invitation email to the queue", async () => {
    const context = {
      inviterName: "John",
      splitDescription: "Dinner",
      amount: 50,
      joinLink: "http://link",
    };
    await service.sendInvitation("test@example.com", context);
    expect(queue.add).toHaveBeenCalledWith("sendEmail", {
      to: "test@example.com",
      type: "invitation",
      context,
    });
  });

  it("should add a payment confirmation email to the queue", async () => {
    const context = { amount: 20, splitDescription: "Rent", txHash: "0x123" };
    await service.sendPaymentConfirmation("test@example.com", context);
    expect(queue.add).toHaveBeenCalledWith("sendEmail", {
      to: "test@example.com",
      type: "confirmation",
      context,
    });
  });

  it("should compile templates and send via transporter", async () => {
    configService.get.mockReturnValue(undefined);
    service.onModuleInit();

    (fs.readFileSync as jest.Mock).mockReturnValue("Hello {{inviterName}}");

    await service.sendTemplatedEmail("test@example.com", "invitation", {
      inviterName: "John",
    });

    expect(transporterMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Invitation to join a new Split on StellarSplit",
        html: "Hello John",
      }),
    );
  });
});
