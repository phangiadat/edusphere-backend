import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Reset token nhận được từ email',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reset token không được để trống' })
  token: string;

  @ApiProperty({
    example: 'NewSecretPassword123',
    description: 'Mật khẩu mới (6-50 ký tự)',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  @MaxLength(50, { message: 'Mật khẩu mới không được vượt quá 50 ký tự' })
  newPassword: string;
}
