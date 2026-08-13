import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

// Mock the @google/genai module
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe('AiService', () => {
  let service: AiService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();
    mockGenerateContent.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GEMINI_API_KEY') return 'fake-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('askCourseAssistant', () => {
    const mockLesson = {
      id: 'lesson-1',
      title: 'Giới thiệu NestJS',
      content: 'NestJS là một framework Node.js...',
      videoUrl: null,
      order: 1,
      isPublished: true,
      isFreePreview: false,
      chapterId: 'ch-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return AI answer successfully', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson);
      mockGenerateContent.mockResolvedValue({
        text: 'NestJS sử dụng kiến trúc module-based...',
      });

      const result = await service.askCourseAssistant(
        'lesson-1',
        'NestJS là gì?',
      );

      expect(result).toEqual({
        answer: 'NestJS sử dụng kiến trúc module-based...',
      });
      expect(mockPrisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
      });
    });

    it('should throw NotFoundException when lesson does not exist', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(null);

      await expect(
        service.askCourseAssistant('non-existent', 'NestJS là gì?'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when Gemini API fails', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson);
      mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

      await expect(
        service.askCourseAssistant('lesson-1', 'NestJS là gì?'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
