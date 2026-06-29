import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/registro — Crear cuenta (público, sin JWT)
   */
  @Post('registro')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login — Autenticar y obtener JWT (público, sin JWT)
   * HTTP 403 si la cuenta está inactiva.
   */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
