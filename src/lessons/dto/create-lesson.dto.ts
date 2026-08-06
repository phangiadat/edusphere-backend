import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên bài giảng không được để trống' })
  title: string;

  @IsUUID('all', { message: 'ID chương học không hợp lệ' })
  @IsNotEmpty({ message: 'Chương học không được để trống' })
  chapterId: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;
}
