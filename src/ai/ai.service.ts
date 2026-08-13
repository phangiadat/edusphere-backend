import { GoogleGenAI } from '@google/genai';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Chưa cấu hình GEMINI_API_KEY');
    }

    this.ai = new GoogleGenAI({ apiKey: apiKey });
  }

  async askCourseAssistant(lessonId: string, question: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học để lấy bối cảnh');
    }

    const prompt = `
      Dưới đây là nội dung của bài học "${lesson.title}":
      ---
      ${lesson.content}
      ---
      Dựa vào kiến thức của bài học trên, hãy trả lời câu hỏi sau của học viên:
      "Câu hỏi: ${question}"
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Bạn là một trợ lý giảng viên nhiệt tình, tận tâm trên nền tảng học tập E-learning. Nhiệm vụ của bạn là giải đáp thắc mắc của học viên. Hãy trả lời ngắn gọn, súc tích, dễ hiểu và luôn khuyến khích học viên. Nếu câu hỏi không liên quan đến bài học, hãy khéo léo từ chối và hướng họ quay lại bài giảng.',
        },
      });

      return { answer: response.text };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'AI đang bận, vui lòng thử lại sau',
      );
    }
  }
}
