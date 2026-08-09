import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề bài tập không được để trống' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Định dạng ngày tháng deadline không hợp lệ' })
  dueDate?: string;

  @IsString()
  @IsNotEmpty({ message: 'ID của chương không được để trống' })
  chapterId: string;
}
