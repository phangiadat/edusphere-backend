import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateConversation(userId1: string, userId2: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          {
            user1Id: userId1,
            user2Id: userId2,
          },
          {
            user1Id: userId2,
            user2Id: userId1,
          },
        ],
      },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          user1Id: userId1,
          user2Id: userId2,
        },
      });
    }
  }

  async getUserConversation(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        OR: [
          {
            user1Id: userId,
          },
          {
            user2Id: userId,
          },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        user2: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
