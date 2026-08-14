import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Headers,
  Query,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(Role.STUDENT, Role.INSTRUCTOR)
  @Post('checkout/:courseId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Student/Instructor] Tạo Stripe Checkout Session' })
  @ApiResponse({ status: 201, description: 'Trả về checkout URL' })
  createCheckout(@Param('courseId') courseId: string, @Req() req) {
    return this.enrollmentsService.createCheckoutSession(req.user.id, courseId);
  }

  @SkipThrottle()
  @Post('webhook')
  @ApiOperation({ summary: '[Stripe] Webhook nhận sự kiện thanh toán - không cần token' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.enrollmentsService.handleStripeWebhook(req, signature);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-courses')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Student] Lấy danh sách khóa học đã mua' })
  getMyCourses(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.enrollmentsService.getMyCourses(req.user.id, +page, +limit);
  }
}
