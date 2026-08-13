import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeAssignmentDto } from './dto/grade-assignment.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { EnrollmentStatus, SubmissionStatus } from '@prisma/client';

@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(instructorId: string, createAssignmentDto: CreateAssignmentDto) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: createAssignmentDto.chapterId },
      select: {
        id: true,
        course: { select: { instructorId: true } },
      },
    });
    if (!chapter) {
      throw new NotFoundException('Không tìm thấy chương học này');
    }

    if (chapter.course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Bạn không có quyền tạo bài tập cho khóa học này',
      );
    }

    return this.prisma.assignment.create({
      data: {
        title: createAssignmentDto.title,
        description: createAssignmentDto.description,
        dueDate: createAssignmentDto.dueDate,
        chapterId: createAssignmentDto.chapterId,
      },
    });
  }

  async submitAssignment(
    userId: string,
    assignmentId: string,
    submitDto: SubmitAssignmentDto,
  ) {
    if (!submitDto.content && !submitDto.fileUrl) {
      throw new BadRequestException(
        'Bạn phải nhập nội dung hoặc đính kèm file để nộp bài',
      );
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        dueDate: true,
        chapter: {
          select: { courseId: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Không tìm thấy bài tập này');
    }

    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      throw new BadRequestException('Đã quá hạn nộp bài');
    }

    const courseId = assignment.chapter.courseId;
    const isEnrolled = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
      select: { status: true },
    });
    if (!isEnrolled || isEnrolled.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException(
        'Bạn phải tham gia khóa học này để có thể nộp bài',
      );
    }

    return this.prisma.assignmentSubmission.upsert({
      where: {
        userId_assignmentId: { userId, assignmentId },
      },
      update: {
        content: submitDto.content,
        fileUrl: submitDto.fileUrl,
        status: SubmissionStatus.SUBMITTED,
      },
      create: {
        userId,
        assignmentId,
        content: submitDto.content,
        fileUrl: submitDto.fileUrl,
        status: SubmissionStatus.SUBMITTED,
      },
    });
  }

  async getSubmissions(
    instructorId: string,
    assignmentId: string,
    page = 1,
    limit = 20,
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        chapter: {
          select: {
            course: { select: { instructorId: true } },
          },
        },
      },
    });
    if (!assignment) {
      throw new NotFoundException('Không tìm thấy bài tập');
    }

    if (assignment.chapter.course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem dữ liệu của khóa học này',
      );
    }

    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      this.prisma.assignmentSubmission.findMany({
        where: { assignmentId },
        select: {
          id: true,
          content: true,
          fileUrl: true,
          score: true,
          feedback: true,
          status: true,
          userId: true,
          assignmentId: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              fullName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.assignmentSubmission.count({ where: { assignmentId } }),
    ]);

    return {
      data: submissions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async gradeSubmission(
    instructorId: string,
    submissionId: string,
    gradeDto: GradeAssignmentDto,
  ) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        userId: true,
        assignment: {
          select: {
            chapter: {
              select: {
                course: {
                  select: {
                    title: true,
                    instructorId: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!submission) {
      throw new NotFoundException('Không tìm thấy bài nộp này');
    }
    const courseOwnerId = submission.assignment.chapter.course.instructorId;
    if (courseOwnerId !== instructorId) {
      throw new ForbiddenException('Bạn không có quyền chấm điểm bài này');
    }

    const updatedSubmission = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score: gradeDto.score,
        feedback: gradeDto.feedback,
        status: SubmissionStatus.GRADED,
      },
    });

    const courseName = submission.assignment.chapter.course.title;

    await this.notificationsService.createNotification({
      userId: submission.userId,
      type: 'ASSIGNMENT_GRADED',
      title: 'Đã có điểm bài tập!',
      message: `Giảng viên vừa chấm điểm bài tập trong khóa học "${courseName}". Bạn được ${gradeDto.score} điểm.`,
      link: `/courses/${courseOwnerId}/assignments/${submissionId}`,
    });

    return updatedSubmission;
  }
}
