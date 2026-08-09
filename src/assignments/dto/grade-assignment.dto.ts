import { IsNumber, Min, Max, IsString, IsOptional } from 'class-validator';

export class GradeAssignmentDto {
  @IsNumber()
  @Min(0, { message: 'Điểm số không được nhỏ hơn 0' })
  @Max(100, { message: 'Điểm số không được vượt quá 100' })
  score: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
