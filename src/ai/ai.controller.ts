import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AskQuestionDto } from './dto/ask-question.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  async askQuestion(@Body() dto: AskQuestionDto) {
    return this.aiService.askCourseAssistant(dto.lessonId, dto.question);
  }
}
