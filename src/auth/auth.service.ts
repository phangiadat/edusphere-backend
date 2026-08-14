import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

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
    // 7 ngày = 7 * 24 * 60 * 60 giây
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

    // Lưu refresh token đã hash vào DB
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

    // 1. Xác minh chữ ký JWT của refreshToken
    try {
      payload = this.jwtService.verify(incomingRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // 2. Tìm user trong DB, kiểm tra refreshToken đã hash
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

    // 3. Cấp token mới (Rotation)
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
    // Xóa refreshToken trong DB → vô hiệu hóa phiên
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Đăng xuất thành công' };
  }
}
