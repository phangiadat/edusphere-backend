import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async create(createLessonDto: CreateLessonDto, instructorId: string) {
    const { title, chapterId, content, videoUrl } = createLessonDto;

    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
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
        'Bạn không có quyền thêm bài giảng vào chương này',
      );
    }

    const lastLesson = await this.prisma.lesson.findFirst({
      where: { chapterId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const newOrder = lastLesson ? lastLesson.order + 1 : 1;

    return this.prisma.lesson.create({
      data: {
        title,
        chapterId,
        content,
        videoUrl,
        order: newOrder,
      },
    });
  }

  async findAllByChapter(
    chapterId: string,
    instructorId: string,
    page?: number,
    limit?: number,
  ) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        course: { select: { instructorId: true } },
      },
    });

    if (!chapter) {
      throw new NotFoundException('Không tìm thấy chương học');
    }
    if (chapter.course.instructorId !== instructorId) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách này');
    }

    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = page && limit ? limit : undefined;

    return this.prisma.lesson.findMany({
      where: { chapterId },
      orderBy: { order: 'asc' },
      skip,
      take,
    });
  }

  async findOne(id: string, instructorId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        videoUrl: true,
        order: true,
        duration: true,
        isPublished: true,
        isFreePreview: true,
        chapterId: true,
        createdAt: true,
        updatedAt: true,
        chapter: {
          select: {
            course: {
              select: { instructorId: true },
            },
          },
        },
      },
    });
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài giảng');
    }

    if (lesson.chapter.course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Bạn không có quyền thao tác trên bài giảng này!',
      );
    }

    const { chapter, ...lessonData } = lesson;
    return lessonData;
  }

  async update(
    id: string,
    updateLessonDto: UpdateLessonDto,
    instructorId: string,
  ) {
    await this.findOne(id, instructorId);
    return this.prisma.lesson.update({
      where: { id },
      data: updateLessonDto,
    });
  }

  async remove(id: string, instructorId: string) {
    await this.findOne(id, instructorId);

    await this.prisma.lesson.delete({
      where: { id },
    });
    return { message: 'Đã xóa bài giảng thành công!' };
  }

  async watchLesson(id: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        videoUrl: true,
        order: true,
        duration: true,
        isPublished: true,
        isFreePreview: true,
        chapterId: true,
        createdAt: true,
        updatedAt: true,
        chapter: {
          select: {
            courseId: true,
            course: {
              select: { instructorId: true },
            },
          },
        },
      },
    });
    if (!lesson || !lesson.isPublished) {
      throw new NotFoundException(
        'Bài giảng không tồn tại hoặc chưa được xuất bản!',
      );
    }

    const courseId = lesson.chapter.courseId;
    const instructorId = lesson.chapter.course.instructorId;
    const isInstructor = instructorId === userId;
    if (!isInstructor) {
      const isEnrolled = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId },
        },
        select: { status: true },
      });
      if (!isEnrolled || isEnrolled.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException(
          'Bạn phải mua khóa học này để xem nội dung',
        );
      }
    }

    const { chapter, ...lessonData } = lesson;
    return lessonData;
  }

  async markAsComplete(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        chapter: {
          select: { courseId: true },
        },
      },
    });
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài giảng');
    }

    const courseId = lesson.chapter.courseId;
    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { isCompleted: true },
      create: { userId, lessonId, isCompleted: true },
    });

    const courseLessons = await this.prisma.lesson.findMany({
      where: { chapter: { courseId }, isPublished: true },
      select: { id: true },
    });
    const lessonIds = courseLessons.map((l) => l.id);
    const totalLessons = lessonIds.length;

    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        userId,
        isCompleted: true,
        lessonId: { in: lessonIds },
      },
    });

    const progressPercentage =
      totalLessons === 0 ? 0 : (completedLessons / totalLessons) * 100;

    await this.prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { progress: progressPercentage },
    });

    return { message: 'Đã lưu tiến độ học tập', progress: progressPercentage };
  }
}
