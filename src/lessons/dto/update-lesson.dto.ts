import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from './create-lesson.dto';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class UpdateLessonDto extends PartialType(CreateLessonDto) {
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsNumber()
  @IsOptional()
  order?: number;
}
