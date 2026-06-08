import { Controller, Post, Get, Body, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OAuthProfile } from './oauth-profile.interface';

class RegisterDto {
  @IsString() @MinLength(3) @MaxLength(30) username: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.username, dto.email, dto.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req) {
    return this.auth.getMe(req.user.id);
  }

  // JWTs are stateless — there's no server-side session to invalidate, but we
  // expose this so the frontend has a clean endpoint to call (and so it's
  // trivial to add token revocation/blacklisting later if ever needed).
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    return { success: true };
  }

  // --- Google OAuth ---

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google's consent screen; nothing to do here.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req, @Res() res: Response) {
    await this.finishOAuth(req.user, res);
  }

  // --- Discord OAuth ---

  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  discordAuth() {
    // Passport redirects to Discord's consent screen; nothing to do here.
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  async discordCallback(@Request() req, @Res() res: Response) {
    await this.finishOAuth(req.user, res);
  }

  private async finishOAuth(profile: OAuthProfile, res: Response) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    try {
      const { access_token } = await this.auth.loginWithOAuth(profile);
      res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(access_token)}`);
    } catch {
      res.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`);
    }
  }
}
