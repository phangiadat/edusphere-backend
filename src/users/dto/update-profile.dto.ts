import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Nguyễn Văn B',
    description: 'Họ và tên mới',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    description: 'URL ảnh đại diện',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Avatar URL không hợp lệ' })
  avatarUrl?: string;
}
