import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: false,
    description: 'Trạng thái tài khoản (true = Hoạt động, false = Khóa/Ban)',
  })
  @IsBoolean({ message: 'isActive phải là kiểu boolean' })
  @IsNotEmpty()
  isActive: boolean;
}
