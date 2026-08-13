import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  CourseStatus,
  EnrollmentStatus,
  PrismaClient,
  SubmissionStatus,
} from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockNotifications: { createNotification: jest.Mock };

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();
    mockNotifications = {
      createNotification: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  describe('gradeSubmission', () => {
    const mockSubmission = {
      id: 'sub-1',
      content: 'Bài làm của học viên',
      fileUrl: null,
      score: null,
      feedback: null,
      status: SubmissionStatus.SUBMITTED,
      userId: 'student-1',
      assignmentId: 'assign-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      assignment: {
        id: 'assign-1',
        title: 'Bài tập 1',
        description: null,
        dueDate: null,
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
          course: {
            id: 'course-1',
            title: 'Khóa học NestJS',
            description: null,
            price: 100000,
            thumbnail: null,
            status: CourseStatus.PUBLISHED,
            instructorId: 'instructor-1',
            categoryId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
    };

    it('should grade a submission successfully', async () => {
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue(
        mockSubmission as any,
      );
      mockPrisma.assignmentSubmission.update.mockResolvedValue({
        ...mockSubmission,
        score: 85,
        feedback: 'Bài làm tốt!',
        status: SubmissionStatus.GRADED,
      } as any);

      const result = await service.gradeSubmission('instructor-1', 'sub-1', {
        score: 85,
        feedback: 'Bài làm tốt!',
      });

      expect(result.score).toBe(85);
      expect(result.status).toBe(SubmissionStatus.GRADED);
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'student-1',
          type: 'ASSIGNMENT_GRADED',
        }),
      );
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue(null);

      await expect(
        service.gradeSubmission('instructor-1', 'non-existent', {
          score: 85,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when instructor is not course owner', async () => {
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue(
        mockSubmission as any,
      );

      await expect(
        service.gradeSubmission('wrong-instructor', 'sub-1', {
          score: 85,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('submitAssignment', () => {
    const mockAssignment = {
      id: 'assign-1',
      title: 'Bài tập 1',
      description: null,
      dueDate: null,
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

    it('should throw BadRequestException when past due date', async () => {
      const pastDate = new Date('2020-01-01');
      mockPrisma.assignment.findUnique.mockResolvedValue({
        ...mockAssignment,
        dueDate: pastDate,
      } as any);

      await expect(
        service.submitAssignment('student-1', 'assign-1', {
          content: 'Bài làm',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not enrolled', async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue(
        mockAssignment as any,
      );
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.submitAssignment('student-1', 'assign-1', {
          content: 'Bài làm',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when both content and fileUrl are empty', async () => {
      await expect(
        service.submitAssignment('student-1', 'assign-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
