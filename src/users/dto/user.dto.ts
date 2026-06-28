import { IsEnum } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class UpdateUserRoleDto {
  @IsEnum(UserRole, { message: 'Rol inválido' })
  role: UserRole;
}

export class ToggleUserActiveDto {
  is_active: boolean;
}
