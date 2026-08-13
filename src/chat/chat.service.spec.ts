import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('findOrCreateConversation', () => {
    const mockConversation = {
      id: 'conv-1',
      user1Id: 'user-1',
      user2Id: 'user-2',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new conversation when none exists', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.findOrCreateConversation('user-1', 'user-2');

      expect(result).toEqual(mockConversation);
      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: {
          user1Id: 'user-1',
          user2Id: 'user-2',
        },
      });
    });

    it('should return existing conversation when found', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(mockConversation);

      const result = await service.findOrCreateConversation('user-1', 'user-2');

      expect(result).toEqual(mockConversation);
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user tries to chat with themselves', async () => {
      await expect(
        service.findOrCreateConversation('user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMessages', () => {
    it('should throw NotFoundException when conversation does not exist', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return messages for existing conversation', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        user1Id: 'user-1',
        user2Id: 'user-2',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Xin chào',
          isRead: false,
          createdAt: new Date(),
        },
      ];
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await service.getMessages('conv-1');

      expect(result).toEqual(mockMessages);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
