import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CoursesModule } from './courses/courses.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ChaptersModule } from './chapters/chapters.module';
import { LessonsModule } from './lessons/lessons.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { CategoriesModule } from './categories/categories.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

const logger = new Logger('RedisSetup');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', '127.0.0.1');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const ttl = configService.get<number>('REDIS_TTL', 1800) * 1000;

        try {
          const store = await redisStore({
            socket: { host, port, connectTimeout: 3000 },
            ttl,
          });
          logger.log(`✅ Kết nối Redis Cache thành công (${host}:${port})`);
          return { store };
        } catch (error) {
          logger.warn(
            `⚠️ Không thể kết nối Redis Server (${host}:${port}). Tự động fallback sang In-Memory Cache. (Vui lòng bật redis-server để dùng Redis)`,
          );
          return { ttl }; // Fallback to NestJS default Memory Cache
        }
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', '127.0.0.1');
        const port = configService.get<number>('REDIS_PORT', 6379);

        const redisClient = new Redis({
          host,
          port,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });

        // Suppress unhandled crash event when Redis server is offline
        redisClient.on('error', () => {
          // Silent error handling to keep NestJS server running
        });

        return {
          throttlers: [
            {
              name: 'default',
              ttl: 60000,
              limit: 100,
            },
          ],
          storage: new ThrottlerStorageRedisService(redisClient),
        };
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    CloudinaryModule,
    ChaptersModule,
    LessonsModule,
    EnrollmentsModule,
    CategoriesModule,
    ReviewsModule,
    AssignmentsModule,
    NotificationsModule,
    ChatModule,
    AiModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
