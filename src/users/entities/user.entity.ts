import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  first_name: string;

  @Column()
  paternal_last_name: string;

  @Column({ nullable: true })
  maternal_last_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password_hash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CONSULTOR,
  })
  role: UserRole;

  /**
   * Reemplaza el antiguo is_active boolean.
   * PENDIENTE: recién registrado, esperando activación del admin.
   * ACTIVO: habilitado para acceder al sistema.
   * INACTIVO: desactivado manualmente por el admin.
   */
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDIENTE,
  })
  status: UserStatus;

  /**
   * Fecha en la que el administrador confirmó la cuenta por primera vez.
   * null  → solicitud pendiente (nunca fue aceptada, se puede eliminar).
   * fecha → cuenta ya aceptada alguna vez (solo activar/desactivar, nunca eliminar).
   */
  @Column({ type: 'timestamp', nullable: true, default: null })
  confirmed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
