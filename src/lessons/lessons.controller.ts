import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Roles(Role.INSTRUCTOR)
  @Post()
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
}
