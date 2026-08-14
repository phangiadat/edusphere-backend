import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 409, description: 'Email đã được sử dụng' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập - nhận accessToken + refreshToken' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Sai email hoặc mật khẩu' })
  login(@Body() loginDto: LoginDto, @Request() req) {
    return this.authService.login(req.user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới accessToken bằng refreshToken (Token Rotation)',
  })
  @ApiResponse({ status: 200, description: 'Cấp token mới thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Đăng xuất - vô hiệu hóa refreshToken' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy thông tin user hiện tại từ JWT' })
  @ApiResponse({ status: 200, description: 'Thông tin user' })
  getProfile(@Request() req) {
    return req.user;
  }
}
