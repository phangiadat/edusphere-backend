import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}
  async create(createLessonDto: CreateLessonDto, instructorId: string) {
    const { title, chapterId, content, videoUrl } = createLessonDto;

    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { course: true },
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

  async findAllByChapter(chapterId: string, instructorId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { course: true },
    });

    if (!chapter) {
      throw new NotFoundException('Không tìm thấy chương học');
    }
    if (chapter.course.instructorId !== instructorId) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách này');
    }
    return this.prisma.lesson.findMany({
      where: { chapterId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string, instructorId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: {
          include: {
            course: true,
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

    this.prisma.lesson.delete({
      where: { id },
    });
    return { message: 'Đã xóa bài giảng thành công!' };
  }
}
