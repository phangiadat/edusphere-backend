import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailerService } from 'src/common/services/mailer.service';

interface JwtPayloadUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailerService: MailerService,
  ) {}

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private generateAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
  }) {
    return this.jwtService.sign(payload);
  }

  private generateRefreshToken(payload: {
    sub: string;
    email: string;
    role: string;
  }) {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    return this.jwtService.sign(payload, { secret, expiresIn: 60 * 60 * 24 * 7 });
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  // ─── Public Methods ───────────────────────────────────────────────────────

  async register(registerDto: RegisterDto) {
    const { email, password, fullName } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const salt = 10;
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
      },
    });

    const { password: _hashedPassword, ...userWithoutPassword } = newUser;

    return {
      message: 'Đăng ký tài khoản thành công',
      user: userWithoutPassword,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _hashedPassword, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: JwtPayloadUser) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    const hashedRefreshToken = await this.hashToken(refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(incomingRefreshToken: string) {
    let payload: any;

    try {
      payload = this.jwtService.verify(incomingRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, fullName: true, refreshToken: true },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
    }

    const isTokenValid = await bcrypt.compare(
      incomingRefreshToken,
      user.refreshToken,
    );
    if (!isTokenValid) {
      throw new UnauthorizedException('Refresh token không khớp. Vui lòng đăng nhập lại.');
    }

    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const newAccessToken = this.generateAccessToken(newPayload);
    const newRefreshToken = this.generateRefreshToken(newPayload);

    const hashedNewRefreshToken = await this.hashToken(newRefreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedNewRefreshToken },
    });

    return {
      message: 'Làm mới token thành công',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Đăng xuất thành công' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const isOldPasswordMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPasswordMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        refreshToken: null, // Revoke active sessions
      },
    });

    return { message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      // Bảo mật: Không tiết lộ email có tồn tại hay không
      return {
        message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
      };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'RESET_PASSWORD' },
      { expiresIn: 60 * 15 }, // 15 phút
    );

    await this.mailerService.sendResetPasswordEmail(user.email, resetToken);

    return {
      message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
      resetToken, // Dev friendly
    };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new BadRequestException('Reset token không hợp lệ hoặc đã hết hạn');
    }

    if (payload.type !== 'RESET_PASSWORD') {
      throw new BadRequestException('Loại token không hợp lệ');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        refreshToken: null,
      },
    });

    return { message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.' };
  }
}
