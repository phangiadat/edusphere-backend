import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateConversation(userId1: string, userId2: string) {
    if (userId1 === userId2) {
      throw new BadRequestException('Không thể tạo hội thoại với chính mình');
    }

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

    return conversation;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ) {
    const savedMessage = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        isRead: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return savedMessage;
  }

  async getUserConversation(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
        select: {
          id: true,
          user1Id: true,
          user2Id: true,
          createdAt: true,
          updatedAt: true,
          user1: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              email: true,
              role: true,
            },
          },
          user2: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              email: true,
              role: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              senderId: true,
              isRead: true,
              createdAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
      }),
    ]);

    return {
      data: conversations,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMessages(conversationId: string, page = 1, limit = 50) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          isRead: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: messages,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
