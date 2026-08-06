import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateChapterDto {
  @IsString({ message: 'Tên chương phải là một chuỗi văn bản' })
  @IsNotEmpty({ message: 'Tên chương không được để trống' })
  title: string;

  @IsUUID('all', { message: 'ID khóa học không hợp lệ' })
  @IsNotEmpty({ message: 'Khóa học không được để trống' })
  courseId: string;
}
