import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'zhangsan', description: '用户名' })
  @IsString()
  username: string;

  @ApiProperty({ example: '123456', description: '密码' })
  @IsString()
  password: string;

  @ApiProperty({ example: '张三', description: '姓名' })
  @IsString()
  name: string;

  @ApiProperty({ example: '13800138000', description: '手机号', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PARKING_ATTENDANT, description: '角色', required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: true, description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
