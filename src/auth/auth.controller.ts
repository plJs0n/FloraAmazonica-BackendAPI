import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, SocialLoginDto, CheckEmailDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/registro — Crear cuenta (público) */
  @Post('registro')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /auth/register — Crear cuenta para app iOS (devuelve objeto usuario) */
  @Post('register')
  registerForApp(@Body() dto: RegisterDto) {
    return this.authService.registerForApp(dto);
  }

  /** POST /auth/login — Autenticar y obtener JWT (público) */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** GET /auth/profile — Perfil del usuario autenticado (app iOS) */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user);
  }

  /** POST /auth/check-email — Verificar si un correo ya tiene cuenta (público) */
  @Post('check-email')
  checkEmail(@Body() dto: CheckEmailDto) {
    return this.authService.checkEmail(dto.email);
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
