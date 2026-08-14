import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(Role.INSTRUCTOR, Role.STUDENT)
  @Post('course/:courseId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Student] Tạo hoặc cập nhật đánh giá khóa học' })
  createOrUpdateReview(
    @Param('courseId') courseId: string,
    @Body() createReviewDto: CreateReviewDto,
    @Req() req,
  ) {
    return this.reviewsService.createOrUpdateReview(
      req.user.id,
      courseId,
      createReviewDto,
    );
  }

  @Get('course/:courseId/list')
  @ApiOperation({ summary: '[Public] Lấy danh sách đánh giá khóa học' })
  getCourseReviews(
    @Param('courseId') courseId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reviewsService.getCourseReviews(courseId, +page, +limit);
  }

  @Get('course/:courseId/stats')
  @ApiOperation({ summary: '[Public] Lấy điểm đánh giá trung bình khóa học' })
  getCourseStats(@Param('courseId') courseId: string) {
    return this.reviewsService.getCourseStats(courseId);
  }
}
