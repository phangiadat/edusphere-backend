import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString({ message: 'Tên khóa học phải là một chuỗi văn bản' })
  @IsNotEmpty({ message: 'Tên khóa học không được để trống' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'Giá của khóa học phải là một con số' })
  @Min(0, { message: 'Giá của khóa học không được là số âm' })
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  thumbnail?: string;
}
