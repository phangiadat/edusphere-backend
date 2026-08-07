import {
  BadRequestException,
  Injectable,
  NotFoundException,
  RawBodyRequest,
} from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  private stripe: Stripe;
  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECREY_KEY as string, {
      apiVersion: '2026-07-29.dahlia',
    });
  }
  async createCheckoutSession(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });
    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại');
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
      throw new BadRequestException(`Webhook Error: ${err.message}`);
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

      await this.prisma.enrollment.create({
        data: {
          userId,
          courseId,
          pricePaid,
          status: 'ACTIVE',
        },
      });
    }

    return { received: true };
  }

  async getMyCourses(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        userId: userId,
        status: 'ACTIVE',
      },
      include: {
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
    });

    return enrollments.map((enrollment) => ({
      enrollemntId: enrollment.id,
      progress: enrollment.progress,
      purchaseAt: enrollment.createdAt,
      course: enrollment.course,
    }));
  }

  findAll() {
    return `This action returns all enrollments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} enrollment`;
  }

  update(id: number, updateEnrollmentDto: UpdateEnrollmentDto) {
    return `This action updates a #${id} enrollment`;
  }

  remove(id: number) {
    return `This action removes a #${id} enrollment`;
  }
}
