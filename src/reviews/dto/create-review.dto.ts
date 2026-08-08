import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'Vui lòng chọn số sao đánh giá' })
  @IsInt({ message: 'Số sao phải la số nguyên' })
  @Min(1, { message: 'Đánh giá tối thiểu là 1 sao' })
  @Max(5, { message: 'Đánh giá tối đa là 5 sao' })
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
