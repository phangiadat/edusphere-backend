import { IsNotEmpty, IsString } from 'class-validator';

export class AskQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'ID bài học không được để trống' })
  lessonId: string;

  @IsString()
  @IsNotEmpty({ message: 'Câu hỏi không được để trống' })
  question: string;
}
