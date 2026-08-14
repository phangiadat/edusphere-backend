import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPass123',
    description: 'Mật khẩu hiện tại',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  oldPassword: string;

  @ApiProperty({
    example: 'NewSecurePass123',
    description: 'Mật khẩu mới (ít nhất 6 ký tự)',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  @MaxLength(50, { message: 'Mật khẩu mới không được vượt quá 50 ký tự' })
  newPassword: string;
}
