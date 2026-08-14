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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
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

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseInterceptors(CacheInterceptor)
  @CacheKey('all_published_courses')
  @CacheTTL(1800 * 1000)
  @Get('public/all')
  @ApiOperation({ summary: '[Public] Lấy danh sách khóa học đã xuất bản' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Danh sách khóa học' })
  findAllPublic(@Query() filterDto: CourseFilterDto) {
    return this.coursesService.findAllPublic(filterDto);
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1800 * 1000)
  @Get('public/:id')
  @ApiOperation({ summary: '[Public] Xem chi tiết khóa học' })
  @ApiResponse({ status: 200, description: 'Chi tiết khóa học' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khóa học' })
  findOnePublic(@Param('id') id: string) {
    return this.coursesService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @Get('admin/pending')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Lấy danh sách khóa học chờ duyệt' })
  @ApiResponse({ status: 200, description: 'Danh sách khóa học PENDING' })
  getPendingCourses() {
    return this.coursesService.getPendingCourses();
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id/review')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Duyệt/từ chối khóa học' })
  @ApiResponse({ status: 200, description: 'Kết quả duyệt khóa học' })
  reviewCourse(@Param('id') id: string, @Body() reviewDto: ReviewCourseDto) {
    return this.coursesService.reviewCourse(id, reviewDto);
  }

  @Roles(Role.INSTRUCTOR)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Instructor] Tạo khóa học mới' })
  @ApiResponse({ status: 201, description: 'Khóa học đã được tạo' })
  create(@Body() createCourseDto: CreateCourseDto, @Req() req) {
    const instructorId = req.user.id;
    return this.coursesService.create(createCourseDto, instructorId);
  }

  @Roles(Role.INSTRUCTOR)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Instructor] Lấy danh sách khóa học của mình' })
  findAll(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.coursesService.findAll(req.user.id, +page, +limit);
  }

  @Roles(Role.INSTRUCTOR)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Instructor] Xem chi tiết khóa học của mình' })
  findOne(@Param('id') id: string, @Req() req) {
    return this.coursesService.findOne(id, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Instructor] Cập nhật thông tin khóa học' })
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req,
  ) {
    return this.coursesService.update(id, updateCourseDto, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Instructor] Xóa khóa học' })
  remove(@Param('id') id: string, @Req() req) {
    return this.coursesService.remove(id, req.user.id);
  }

  @Roles(Role.INSTRUCTOR)
  @Post(':id/thumbnail')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Instructor] Upload ảnh bìa khóa học' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Instructor] Gửi khóa học để Admin duyệt' })
  @ApiResponse({ status: 200, description: 'Đã gửi yêu cầu duyệt' })
  submitForReview(@Param('id') id: string, @Req() req) {
    return this.coursesService.submitForReview(id, req.user.id);
  }
}
