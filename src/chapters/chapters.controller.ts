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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Chapters')
@ApiBearerAuth('JWT-auth')
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Roles(Role.INSTRUCTOR)
  @Post()
  @ApiOperation({ summary: '[Instructor] Tạo chương học mới' })
  create(@Body() createChapterDto: CreateChapterDto, @Req() req) {
    return this.chaptersService.create(createChapterDto, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Get('course/:courseId')
  @ApiOperation({ summary: '[Instructor] Lấy danh sách chương của khóa học' })
  findAllByCourse(@Param('courseId') courseId: string, @Req() req) {
    return this.chaptersService.findAllByCourse(courseId, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.chaptersService.findOne(id, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChapterDto: UpdateChapterDto,
    @Req() req,
  ) {
    return this.chaptersService.update(id, updateChapterDto, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.chaptersService.remove(id, req.user.id);
  }
}
