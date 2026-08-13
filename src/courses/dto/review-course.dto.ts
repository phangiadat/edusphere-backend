import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CourseStatus } from '@prisma/client';

export class ReviewCourseDto {
  @IsEnum(CourseStatus, {
    message: 'Trạng thái chỉ được là PUBLISHED hoặc REJECTED',
  })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  status: CourseStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
