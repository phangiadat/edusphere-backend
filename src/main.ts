import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // ─── Security: Helmet HTTP Headers ────────────────────────────────────────
  app.use(helmet());

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── Validation ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ─── Swagger / OpenAPI ────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('EduSphere Backend API')
    .setDescription(
      `
## 🎓 EduSphere — E-Learning Platform API

Hệ thống backend REST API cho nền tảng học trực tuyến EduSphere.
Xây dựng trên NestJS + Prisma + PostgreSQL, tích hợp Redis Cache, Rate Limiting, Stripe Payment và Google Gemini AI.

### Authentication
Sử dụng **Bearer JWT Token**. Đăng nhập qua \`POST /auth/login\` để nhận \`accessToken\`.
Sau đó nhấn **Authorize** và nhập \`Bearer <accessToken>\`.
    `,
    )
    .setVersion('2.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Nhập JWT Access Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Đăng ký, Đăng nhập, Refresh Token, Logout')
    .addTag('Courses', 'Quản lý khóa học')
    .addTag('Chapters', 'Quản lý chương học')
    .addTag('Lessons', 'Quản lý bài giảng')
    .addTag('Enrollments', 'Đăng ký khóa học & Thanh toán Stripe')
    .addTag('Reviews', 'Đánh giá khóa học')
    .addTag('Assignments', 'Bài tập & Chấm điểm')
    .addTag('Categories', 'Danh mục khóa học')
    .addTag('Notifications', 'Thông báo')
    .addTag('Chat', 'Tin nhắn 1-1')
    .addTag('AI', 'Trợ lý AI (Google Gemini)')
    .addServer(`http://localhost:${process.env.PORT ?? 3000}`, 'Local Development')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
    customSiteTitle: 'EduSphere API Docs',
  });

  await app.listen(process.env.PORT ?? 3000);

  console.log(`\n🚀 EduSphere Backend đang chạy tại: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`📖 Swagger API Docs: http://localhost:${process.env.PORT ?? 3000}/api/docs\n`);
}
bootstrap();
