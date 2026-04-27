import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private userService: UsersService,
        private jwtService: JwtService,
    ) {}

    async handleGithubCallback(githubUser: {
        githubId: string;
        username: string;
        email?: string;
        avatarUrl?: string;
    }) {
        const user = await this.userService.findOrCreate(githubUser);

        if (!user.is_active) {
            throw new ForbiddenException('Account is deactivated');
        }

        return this.issueTokens(user);
    }

    async issueTokens(user: { id: string; role: string }) {
        const payload = { sub: user.id, role: user.role };

        const access_token = this.jwtService.sign(payload, {
            expiresIn: '3m',
        });

        const refresh_token = crypto.randomBytes(64).toString('hex');
        const expires_at = new Date(Date.now() + 5 * 60 * 1000);


        await this.prisma.refreshToken.create({
            data: {
                token: refresh_token,
                user_id: user.id,
                expires_at,
                is_used: false,
            },
        });

        return { access_token, refresh_token };
    }

    async refreshTokens(refreshToken: string) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });

        if (!stored || stored.is_used || stored.expires_at <new Date()) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

       if (!stored.user.is_active) {
        throw new ForbiddenException('Account is deactivated');
       }

       await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { is_used: true },
       });

       return this.issueTokens(stored.user);
    }

    async logout(refreshToken: string) {
        await this.prisma.refreshToken.updateMany({
            where: { token: refreshToken, is_used: false },
            data: { is_used: true },
        });
    }

    async validateUser(userId: string) {
        const user = await this.userService.findById(userId);
        if (!user || !user.is_active) return null;
        return user;
    }
}
