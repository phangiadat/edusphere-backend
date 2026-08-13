import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateReview(
    userId: string,
    courseId: string,
    createReviewDto: CreateReviewDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { status: true },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException(
        'Bạn phải sở hữu khóa học này mới được phép đánh giá',
      );
    }

    return this.prisma.review.upsert({
      where: {
        userId_courseId: { userId, courseId },
      },
      update: {
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
      },
      create: {
        userId,
        courseId,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
      },
    });
  }

  async getCourseReviews(courseId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { courseId },
        select: {
          id: true,
          rating: true,
          comment: true,
          userId: true,
          courseId: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { courseId } }),
    ]);

    return {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCourseStats(courseId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { id: true },
    });

    return {
      averageRating: stats._avg.rating
        ? parseFloat(stats._avg.rating.toFixed(1))
        : 0,
      totalReviews: stats._count.id,
    };
  }
}
