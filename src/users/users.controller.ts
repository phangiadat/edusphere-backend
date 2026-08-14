import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/config/multer.config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân (fullName, avatarUrl)' })
  @ApiResponse({ status: 200, description: 'Cập nhật hồ sơ thành công' })
  updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Patch('avatar')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: 'Tải lên ảnh đại diện cá nhân (Cloudinary)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Tải lên ảnh đại diện thành công' })
  uploadAvatar(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh để tải lên');
    }
    return this.usersService.updateAvatar(req.user.id, file);
  }

  // ─── Admin Endpoints ──────────────────────────────────────────────────────

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: '[Admin] Lấy danh sách người dùng (tìm kiếm, lọc, phân trang)' })
  @ApiResponse({ status: 200, description: 'Danh sách người dùng' })
  findAllForAdmin(@Query() filterDto: UserFilterDto) {
    return this.usersService.findAllForAdmin(filterDto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/role')
  @ApiOperation({ summary: '[Admin] Thay đổi vai trò người dùng (STUDENT, INSTRUCTOR, ADMIN)' })
  @ApiResponse({ status: 200, description: 'Cập nhật vai trò thành công' })
  updateUserRole(
    @Req() req,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(req.user.id, targetUserId, dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin] Khóa hoặc mở khóa tài khoản người dùng (Ban/Unban)' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  updateUserStatus(
    @Req() req,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(req.user.id, targetUserId, dto);
  }
}
