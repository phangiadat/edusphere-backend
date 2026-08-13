import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { CourseStatus, PrismaClient } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CoursesService', () => {
  let service: CoursesService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockNotifications: { createNotification: jest.Mock };

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();
    mockNotifications = {
      createNotification: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CloudinaryService, useValue: { uploadFile: jest.fn() } },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('reviewCourse', () => {
    const mockCourse = {
      id: 'course-1',
      title: 'Khóa học NestJS',
      description: 'Học NestJS từ cơ bản đến nâng cao',
      price: 500000,
      thumbnail: null,
      status: CourseStatus.PENDING,
      instructorId: 'instructor-1',
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should approve a PENDING course and send notification', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse as any);
      const updatedCourse = { ...mockCourse, status: CourseStatus.PUBLISHED };
      mockPrisma.course.update.mockResolvedValue(updatedCourse as any);

      const result = await service.reviewCourse('course-1', {
        status: CourseStatus.PUBLISHED,
      });

      expect(result.status).toBe(CourseStatus.PUBLISHED);
      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        data: { status: CourseStatus.PUBLISHED },
      });
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'instructor-1',
          type: 'COURSE_APPROVED',
        }),
      );
    });

    it('should throw NotFoundException when course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewCourse('non-existent', { status: CourseStatus.PUBLISHED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when course is not in PENDING status', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.DRAFT,
      } as any);

      await expect(
        service.reviewCourse('course-1', { status: CourseStatus.PUBLISHED }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
