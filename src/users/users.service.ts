import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      message: 'Cập nhật hồ sơ thành công',
      user: updatedUser,
    };
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    try {
      const uploadResult = (await this.cloudinaryService.uploadFile(
        file,
      )) as any;
      const avatarUrl = uploadResult.secure_url;

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
        },
      });

      return {
        message: 'Tải lên ảnh đại diện thành công',
        user: updatedUser,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi tải ảnh lên Cloudinary',
      );
    }
  }

  // ─── Admin Methods ────────────────────────────────────────────────────────

  async findAllForAdmin(filterDto: UserFilterDto) {
    const { search, role, isActive, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              enrollments: true,
              courses: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserRole(adminUserId: string, targetUserId: string, dto: UpdateUserRoleDto) {
    if (adminUserId === targetUserId) {
      throw new BadRequestException('Bạn không thể tự thay đổi vai trò của chính mình');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    return {
      message: `Đã cập nhật vai trò của ${updatedUser.fullName} thành ${updatedUser.role}`,
      user: updatedUser,
    };
  }

  async updateUserStatus(adminUserId: string, targetUserId: string, dto: UpdateUserStatusDto) {
    if (adminUserId === targetUserId) {
      throw new BadRequestException('Bạn không thể tự khóa tài khoản của chính mình');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isActive: dto.isActive,
        refreshToken: dto.isActive ? user.refreshToken : null, // If banned, revoke sessions
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });

    const actionText = updatedUser.isActive ? 'Mở khóa' : 'Khóa (Ban)';
    return {
      message: `Đã ${actionText} tài khoản của ${updatedUser.fullName}`,
      user: updatedUser,
    };
  }
}
