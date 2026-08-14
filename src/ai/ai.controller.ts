import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AskQuestionDto } from './dto/ask-question.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('ask')
  @ApiOperation({
    summary: 'Hỏi trợ lý AI về nội dung bài giảng (Rate limit: 5 req/phút)',
  })
  @ApiResponse({ status: 200, description: 'Câu trả lời từ Gemini AI' })
  @ApiResponse({
    status: 429,
    description: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
  })
  async askQuestion(@Body() dto: AskQuestionDto) {
    return this.aiService.askCourseAssistant(dto.lessonId, dto.question);
  }
}
