import { MessageType, Prisma } from '@prisma/client';
import type { PrismaService } from '../../common/prisma/prisma.service';

type PrismaLike = PrismaService | Prisma.TransactionClient;

export async function createSystemMessageRecord(
  prisma: PrismaLike,
  input: {
    threadId: string;
    senderId: string;
    body: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const message = await prisma.message.create({
    data: {
      threadId: input.threadId,
      senderId: input.senderId,
      body: input.body.trim(),
      messageType: MessageType.SYSTEM_CARD,
      metadata: input.metadata,
    },
  });

  await prisma.messageThread.update({
    where: {
      id: input.threadId,
    },
    data: {
      updatedAt: message.createdAt,
    },
  });

  return message;
}
