import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AskQuestionDto {
  @ApiProperty({
    example: 'clm1234abcd',
    description: 'ID của bài giảng muốn hỏi về',
  })
  @IsString()
  @IsNotEmpty({ message: 'ID bài học không được để trống' })
  lessonId: string;

  @ApiProperty({
    example: 'Sự khác nhau giữa async/await và Promise là gì?',
    description: 'Câu hỏi của học viên về nội dung bài giảng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Câu hỏi không được để trống' })
  question: string;
}
