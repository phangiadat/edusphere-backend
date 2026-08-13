import { Test, TestingModule } from '@nestjs/testing';
import { LessonsService } from './lessons.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('LessonsService', () => {
  let service: LessonsService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
  });

  describe('markAsComplete', () => {
    const mockLesson = {
      id: 'lesson-1',
      title: 'Bài 1: Giới thiệu',
      content: 'Nội dung bài giảng',
      videoUrl: null,
      order: 1,
      isPublished: true,
      isFreePreview: false,
      chapterId: 'ch-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      chapter: {
        id: 'ch-1',
        title: 'Chương 1',
        order: 1,
        isPublished: true,
        courseId: 'course-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    it('should mark lesson as complete and update progress', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson as any);
      mockPrisma.lessonProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        userId: 'student-1',
        lessonId: 'lesson-1',
        isCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 5 lessons total in the course
      mockPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1' },
        { id: 'lesson-2' },
        { id: 'lesson-3' },
        { id: 'lesson-4' },
        { id: 'lesson-5' },
      ] as any);

      // 3 lessons completed
      mockPrisma.lessonProgress.count.mockResolvedValue(3);

      mockPrisma.enrollment.update.mockResolvedValue({} as any);

      const result = await service.markAsComplete('lesson-1', 'student-1');

      expect(result.message).toBe('Đã lưu tiến độ học tập');
      expect(result.progress).toBe(60); // 3/5 * 100 = 60%
    });

    it('should throw NotFoundException when lesson does not exist', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsComplete('non-existent', 'student-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate progress percentage correctly', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson as any);
      mockPrisma.lessonProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        userId: 'student-1',
        lessonId: 'lesson-1',
        isCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 4 lessons total
      mockPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1' },
        { id: 'lesson-2' },
        { id: 'lesson-3' },
        { id: 'lesson-4' },
      ] as any);

      // 1 completed
      mockPrisma.lessonProgress.count.mockResolvedValue(1);
      mockPrisma.enrollment.update.mockResolvedValue({} as any);

      const result = await service.markAsComplete('lesson-1', 'student-1');

      expect(result.progress).toBe(25); // 1/4 * 100 = 25%
    });
  });
});
