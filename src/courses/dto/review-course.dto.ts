import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReviewCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsIn(['PUBLISHED', 'REJECTED'], {
    message: 'Trạng thái chỉ được là PUBLISHED hoặc REJECTED',
  })
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
