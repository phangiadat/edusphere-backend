import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChaptersService {
  constructor(private prisma: PrismaService) {}

  async create(createChapterDto: CreateChapterDto, instructorId: string) {
    const { title, courseId } = createChapterDto;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học này');
    }
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Bạn không có quyền thêm chương vào khóa học của người khác',
      );
    }

    try {
      const lastChapter = await this.prisma.chapter.findFirst({
        where: { courseId: courseId },
        orderBy: { order: 'desc' },
      });

      const newOrder = lastChapter ? lastChapter.order + 1 : 1;

      const newChapter = await this.prisma.chapter.create({
        data: {
          title,
          courseId,
          order: newOrder,
        },
      });

      return {
        message: 'Tạo chương học thành công',
        data: newChapter,
      };
    } catch (error) {
      throw new InternalServerErrorException('Lỗi hệ thống khi tạo chương học');
    }
  }

  async findAllByCourse(courseId: string, instructorId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học!');
    }
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập vào khóa học này',
      );
    }

    return this.prisma.chapter.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string, instructorId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!chapter) {
      throw new NotFoundException('Không tìm thấy chương học này!');
    }
    if (chapter.course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Bạn không có quyền thao tác trên chương này!',
      );
    }

    const { course, ...chapterData } = chapter;
    return chapterData;
  }

  async update(
    id: string,
    updateChapterDto: UpdateChapterDto,
    instructorId: string,
  ) {
    await this.findOne(id, instructorId);
    return this.prisma.chapter.update({
      where: { id },
      data: updateChapterDto,
    });
  }

  async remove(id: string, instructorId: string) {
    await this.findOne(id, instructorId);

    await this.prisma.chapter.delete({
      where: { id },
    });

    return { message: 'Đã xóa chương học thành công!' };
  }
}
