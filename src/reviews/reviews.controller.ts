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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(Role.INSTRUCTOR, Role.STUDENT)
  @Post('course/:courseId')
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
  getCourseReviews(
    @Param('courseId') courseId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reviewsService.getCourseReviews(courseId, +page, +limit);
  }

  @Get('course/:courseId/stats')
  getCourseStats(@Param('courseId') courseId: string) {
    return this.reviewsService.getCourseStats(courseId);
  }
}
