import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/config/multer.config';
import { CourseFilterDto } from './dto/course-filter.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ReviewCourseDto } from './dto/review-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseInterceptors(CacheInterceptor)
  @CacheKey('all_published_courses')
  @CacheTTL(1800 * 1000)
  @Get('public/all')
  findAllPublic(@Query() filterDto: CourseFilterDto) {
    return this.coursesService.findAllPublic(filterDto);
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1800 * 1000)
  @Get('public/:id')
  findOnePublic(@Param('id') id: string) {
    return this.coursesService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @Get('admin/pending')
  getPendingCourses() {
    return this.coursesService.getPendingCourses();
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id/review')
  reviewCourse(@Param('id') id: string, @Body() reviewDto: ReviewCourseDto) {
    return this.coursesService.reviewCourse(id, reviewDto);
  }

  @Roles(Role.INSTRUCTOR)
  @Post()
  create(@Body() createCourseDto: CreateCourseDto, @Req() req) {
    const instructorId = req.user.id;
    return this.coursesService.create(createCourseDto, instructorId);
  }

  @Roles(Role.INSTRUCTOR)
  @Get()
  findAll(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.coursesService.findAll(req.user.id, +page, +limit);
  }

  @Roles(Role.INSTRUCTOR)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.coursesService.findOne(id, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req,
  ) {
    return this.coursesService.update(id, updateCourseDto, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.coursesService.remove(id, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Post(':id/thumbnail')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  uploadThumbnail(
    @Param('id') id: string,
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn một file ảnh để tải lên');
    }

    return this.coursesService.updateThumbnail(id, req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.INSTRUCTOR)
  @Post(':id/submit-review')
  submitForReview(@Param('id') id: string, @Req() req) {
    return this.coursesService.submitForReview(id, req.user.id);
  }
}
