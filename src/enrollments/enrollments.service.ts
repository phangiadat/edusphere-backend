import {
  BadRequestException,
  Injectable,
  NotFoundException,
  RawBodyRequest,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CourseStatus, EnrollmentStatus } from '@prisma/client';

@Injectable()
export class EnrollmentsService {
  private stripe: Stripe;
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationService: NotificationsService,
  ) {
    const stripeKey = this.configService.get<string>(
      'STRIPE_SECRET_KEY',
    ) as string;
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2026-07-29.dahlia',
    });
  }
  async createCheckoutSession(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
        title: true,
        price: true,
        thumbnail: true,
        status: true,
      },
    });
    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException(
        'Khóa học này chưa được xuất bản hoặc đã bị gỡ bỏ!',
      );
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });
    if (existingEnrollment) {
      throw new BadRequestException('Bạn đã sở hữu khóa học này rồi');
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      metadata: {
        userId,
        courseId,
        pricePaid: course.price.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: 'vnd',
            product_data: {
              name: course.title,
              images: course.thumbnail ? [course.thumbnail] : [],
            },
            unit_amount: course.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/courses/${courseId}`,
    });

    return { checkoutUrl: session.url };
  }

  async handleStripeWebhook(req: RawBodyRequest<Request>, signature: string) {
    let event: Stripe.Event;

    if (!req.rawBody) {
      throw new BadRequestException('Webhook Error: Không tìm thấy rawBody');
    }
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.metadata) {
        throw new BadRequestException(
          'Webhook Error: Thiếu thông tin metadata',
        );
      }
      const userId = session.metadata.userId;
      const courseId = session.metadata.courseId;
      const pricePaid = parseFloat(session.metadata.pricePaid);

      const paymentIntentId = session.payment_intent as string;

      await this.prisma.enrollment.create({
        data: {
          userId,
          courseId,
          pricePaid,
          status: EnrollmentStatus.ACTIVE,
          paymentIntentId,
        },
      });

      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true },
      });
      if (course) {
        await this.notificationService.createNotification({
          userId: userId,
          type: 'COURSE_ENROLLED',
          title: 'Thanh toán thành công!',
          message: `Chào mừng bạn đến với khóa học "${course.title}". Bắt đầu hành trình học tập ngay thôi!`,
          link: `/courses/${courseId}/learn`,
        });
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;
      if (paymentIntentId) {
        await this.prisma.enrollment.update({
          where: {
            paymentIntentId,
          },
          data: {
            status: EnrollmentStatus.REFUNDED,
          },
        });
      }
    }

    return { received: true };
  }

  async getMyCourses(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          userId: userId,
          status: EnrollmentStatus.ACTIVE,
        },
        select: {
          id: true,
          progress: true,
          createdAt: true,
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              instructor: {
                select: { fullName: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.enrollment.count({
        where: {
          userId: userId,
          status: EnrollmentStatus.ACTIVE,
        },
      }),
    ]);

    const formattedData = enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      progress: enrollment.progress,
      purchaseAt: enrollment.createdAt,
      course: enrollment.course,
    }));

    return {
      data: formattedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
