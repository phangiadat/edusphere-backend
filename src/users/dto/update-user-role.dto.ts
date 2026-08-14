import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.INSTRUCTOR,
    description: 'Vai trò mới của người dùng',
  })
  @IsEnum(Role, { message: 'Vai trò không hợp lệ (STUDENT, INSTRUCTOR, ADMIN)' })
  @IsNotEmpty()
  role: Role;
}
