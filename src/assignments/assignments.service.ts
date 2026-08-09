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

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}
  async create(instructorId: string, createAssignmentDto: CreateAssignmentDto) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: createAssignmentDto.chapterId },
      include: { course: true },
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
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { chapter: true },
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
    });
    if (!isEnrolled || isEnrolled.status !== 'ACTIVE') {
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
        status: 'SUBMITTED',
      },
      create: {
        userId,
        assignmentId,
        content: submitDto.content,
        fileUrl: submitDto.fileUrl,
        status: 'SUBMITTED',
      },
    });
  }

  async getSubmissions(instructorId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        chapter: {
          include: {
            course: true,
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

    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        user: {
          select: {
            fullName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async gradeSubmission(
    instructorId: string,
    submissionId: string,
    gradeDto: GradeAssignmentDto,
  ) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        assignment: {
          include: {
            chapter: {
              include: {
                course: true,
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

    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score: gradeDto.score,
        feedback: gradeDto.feedback,
        status: 'GRADED',
      },
    });
  }
}
