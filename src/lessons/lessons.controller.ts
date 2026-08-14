import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Roles(Role.INSTRUCTOR)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Instructor] Tạo bài giảng mới' })
  create(@Body() createLessonDto: CreateLessonDto, @Req() req) {
    return this.lessonsService.create(createLessonDto, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Get('chapter/:chapterId')
  findAllByChapter(@Param('chapterId') chapterId: string, @Req() req) {
    return this.lessonsService.findAllByChapter(chapterId, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.lessonsService.findOne(id, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Req() req,
  ) {
    return this.lessonsService.update(id, updateLessonDto, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.lessonsService.remove(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/watch')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Student/Instructor] Xem nội dung bài giảng (yêu cầu đã mua khóa học)' })
  watchLesson(@Param('id') id: string, @Req() req) {
    return this.lessonsService.watchLesson(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Student] Đánh dấu bài giảng đã hoàn thành và cập nhật tiến độ' })
  markAsComplete(@Param('id') id: string, @Req() req) {
    return this.lessonsService.markAsComplete(id, req.user.id);
  }
}
