/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'student@edusphere.vn', description: 'Địa chỉ email đã đăng ký' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: 'SecurePass123', description: 'Mật khẩu' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}
