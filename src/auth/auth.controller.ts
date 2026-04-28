import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Req,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import type { Response, Request } from 'express';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Get('github')
  async githubLogin(@Res() res: Response, @Query('state') state?: string) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callbackUrl = encodeURIComponent(process.env.GITHUB_CALLBACK_URL!);

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const stateParam = state || `web_${crypto.randomBytes(8).toString('hex')}`;

    // Store verifier in DB keyed by state
    await this.prisma.pkceVerifier.create({
      data: {
        state: stateParam,
        code_verifier: codeVerifier,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const url =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${callbackUrl}` +
      `&scope=user:email` +
      `&state=${stateParam}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;

    res.redirect(url);
  }

  @Public()
  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) throw new UnauthorizedException('No code provided');
    if (!state) throw new UnauthorizedException('No state provided');

    // Retrieve verifier from DB
    const pkce = await this.prisma.pkceVerifier.findUnique({
      where: { state },
    });

    if (!pkce || pkce.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired state parameter');
    }

    // Delete used verifier immediately
    await this.prisma.pkceVerifier.delete({ where: { state } });

    // Exchange code with GitHub
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        code_verifier: pkce.code_verifier,
      },
      { headers: { Accept: 'application/json' } },
    );

    const githubAccessToken = tokenRes.data.access_token;
    if (!githubAccessToken) {
      throw new UnauthorizedException('GitHub auth failed');
    }

    // Get user info from GitHub
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    });

    const githubUser = {
      githubId: String(userRes.data.id),
      username: userRes.data.login,
      email: userRes.data.email,
      avatarUrl: userRes.data.avatar_url,
    };

    const tokens = await this.authService.handleGithubCallback(githubUser);

    // CLI flow
    if (state.startsWith('cli_')) {
      const port = state.split('_')[1];
      return res.redirect(
        `http://localhost:${port}/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
      );
    }

    // Web flow — HTTP-only cookies
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });

    const webPortalUrl = process.env.WEB_PORTAL_URL || 'http://localhost:3001';
    return res.redirect(`${webPortalUrl}/dashboard`);
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body('refresh_token') refreshToken: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const token = refreshToken || req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException('No refresh token provided');

    const tokens = await this.authService.refreshTokens(token);

    if (req.cookies?.refresh_token) {
      res.cookie('access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3 * 60 * 1000,
      });
      res.cookie('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
      });
    }

    return res.json({ status: 'success', ...tokens });
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res() res: Response,
    @Body('refresh_token') refreshToken?: string,
  ) {
    const token = refreshToken || req.cookies?.refresh_token;
    if (token) await this.authService.logout(token);

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return res.json({ status: 'success', message: 'Logged out' });
  }

  @Get('me')
  whoami(@Req() req: Request) {
    return { status: 'success', data: req.user };
  }
}