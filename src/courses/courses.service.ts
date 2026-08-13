import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CourseFilterDto } from './dto/course-filter.dto';
import { CourseStatus, Prisma } from '@prisma/client';
import { ReviewCourseDto } from './dto/review-course.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private notificationSerivce: NotificationsService,
  ) {}

  async findAllPublic(filterDto: CourseFilterDto) {
    const { search, minPrice, maxPrice, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    const whereCondition: Prisma.CourseWhereInput = {
      status: CourseStatus.PUBLISHED,
    };

    if (search) {
      whereCondition.title = { contains: search, mode: 'insensitive' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereCondition.price = {};
      if (minPrice !== undefined) {
        whereCondition.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        whereCondition.price.lte = maxPrice;
      }
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          price: true,
          thumbnail: true,
          instructor: {
            select: { fullName: true, avatarUrl: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where: whereCondition }),
    ]);

    return {
      data: courses,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOnePublic(id: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        status: CourseStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        thumbnail: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        instructor: {
          select: { fullName: true, avatarUrl: true },
        },
        chapters: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            order: true,
            isPublished: true,
            courseId: true,
            createdAt: true,
            updatedAt: true,
            lessons: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                duration: true,
                isPublished: true,
                isFreePreview: true,
                chapterId: true,
                createdAt: true,
                updatedAt: true,
                videoUrl: true,
                content: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Không tìm thấy khóa học hoặc khóa học chưa được xuất bản!',
      );
    }

    const sanitizedChapters = course.chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => {
        if (!lesson.isFreePreview) {
          return { ...lesson, videoUrl: null, content: null };
        }
        return lesson;
      }),
    }));

    return { ...course, chapters: sanitizedChapters };
  }

  async create(createCourseDto: CreateCourseDto, instructorId: string) {
    const { title, description, price, thumbnail } = createCourseDto;

    try {
      const existingCourse = await this.prisma.course.findFirst({
        where: {
          title: title,
          instructorId: instructorId,
        },
      });
      if (existingCourse) {
        throw new ConflictException('Bạn đã có khóa học tên này rồi');
      }

      const newCourse = await this.prisma.course.create({
        data: {
          title,
          description,
          price: price || 0,
          thumbnail,
          instructorId,
          status: CourseStatus.DRAFT,
        },
      });

      return {
        message: 'Tạo khóa học thành công',
        data: newCourse,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Lỗi hệ thống khi tạo khóa học');
    }
  }

  async findAll(instructorId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: { instructorId },
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where: { instructorId } }),
    ]);

    return {
      data: courses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, instructorId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học này!');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('Bạn không có quyền truy cập khóa học này!');
    }
    return course;
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    instructorId: string,
  ) {
    await this.findOne(id, instructorId);

    if (updateCourseDto.title) {
      const existingCourse = await this.prisma.course.findFirst({
        where: {
          title: updateCourseDto.title,
          instructorId: instructorId,
          id: { not: id },
        },
      });

      if (existingCourse) {
        throw new ConflictException(
          'Tên khóa học này đã tồn tại trong danh sách khóa học của bạn',
        );
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
    });
  }

  async remove(id: string, instructorId: string) {
    await this.findOne(id, instructorId);

    await this.prisma.course.delete({
      where: { id },
    });

    return {
      message: 'Đã xóa khóa học thành công',
    };
  }

  async updateThumbnail(
    id: string,
    instructorId: string,
    file: Express.Multer.File,
  ) {
    await this.findOne(id, instructorId);

    try {
      const uploadResult = (await this.cloudinaryService.uploadFile(
        file,
      )) as any;
      const fileUrl = uploadResult.secure_url;

      const updatedCourse = await this.prisma.course.update({
        where: { id },
        data: {
          thumbnail: fileUrl,
        },
      });

      return {
        message: 'Cập nhật ảnh bìa lên Cloudinary thành công',
        data: {
          thumbnail: updatedCourse.thumbnail,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi upload ảnh lên Cloud',
      );
    }
  }

  async submitForReview(courseId: string, instructorId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        instructorId: true,
        status: true,
        chapters: {
          select: {
            lessons: {
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Bạn không có quyền thao tác trên khóa học này',
      );
    }
    if (
      course.status !== CourseStatus.DRAFT &&
      course.status !== CourseStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Khóa học đang ở trạng thái ${course.status}, không thể gửi duyệt`,
      );
    }

    const hasContent = course.chapters.some(
      (chapter) => chapter.lessons.length > 0,
    );
    if (!hasContent) {
      throw new BadRequestException(
        'Khóa học phải có ít nhất 1 bài giảng trước khi gửi duyệt',
      );
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        status: CourseStatus.PENDING,
      },
    });
  }

  async getPendingCourses() {
    return this.prisma.course.findMany({
      where: { status: CourseStatus.PENDING },
      select: {
        id: true,
        title: true,
        price: true,
        thumbnail: true,
        status: true,
        updatedAt: true,
        instructor: {
          select: {
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            chapters: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async reviewCourse(courseId: string, reviewDto: ReviewCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        status: true,
        instructorId: true,
      },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    if (course.status !== CourseStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể duyệt khóa học đang ở trạng thái PENDING',
      );
    }
    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        status: reviewDto.status,
      },
    });

    await this.notificationSerivce.createNotification({
      userId: course.instructorId,
      type:
        reviewDto.status === CourseStatus.PUBLISHED
          ? 'COURSE_APPROVED'
          : 'COURSE_REJECTED',
      title:
        reviewDto.status === CourseStatus.PUBLISHED
          ? 'Khóa học đã được duyệt'
          : 'Khóa học cần chỉnh sửa',
      message:
        reviewDto.status === CourseStatus.PUBLISHED
          ? `Tuyệt vời! Khóa học "${course.title}" của bạn đã được xuất bản lên hệ thống.`
          : `Khóa học "${course.title}" của bạn chưa đạt yêu cầu. Lý do: ${reviewDto.reason || 'Vui lòng kiểm tra lại nội dung.'}`,
      link: `/instructor/courses/${course.id}`,
    });

    return updatedCourse;
  }
}
