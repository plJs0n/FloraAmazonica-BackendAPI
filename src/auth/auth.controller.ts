import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, SocialLoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/registro — Crear cuenta local (público) */
  @Post('registro')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /auth/login — Login con email + contraseña (público) */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** POST /auth/google — Login con Google id_token desde iOS (público) */
  @Post('google')
  loginWithGoogle(@Body() dto: SocialLoginDto) {
    return this.authService.loginWithGoogle(dto);
  }

  /** POST /auth/apple — Login con Apple id_token desde iOS (público) */
  @Post('apple')
  loginWithApple(@Body() dto: SocialLoginDto) {
    return this.authService.loginWithApple(dto);
  }
}
