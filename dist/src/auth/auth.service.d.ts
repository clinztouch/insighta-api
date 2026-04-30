import { JwtService } from '@nestjs/jwt';
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
export declare class AuthService {
    private prisma;
    private userService;
    private jwtService;
    constructor(prisma: PrismaService, userService: UsersService, jwtService: JwtService);
    handleGithubCallback(githubUser: {
        githubId: string;
        username: string;
        email?: string;
        avatarUrl?: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    issueTokens(user: {
        id: string;
        role: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    refreshTokens(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(refreshToken: string): Promise<void>;
    validateUser(userId: string): Promise<{
        created_at: Date;
        id: string;
        github_id: string;
        username: string;
        email: string | null;
        avatar_url: string | null;
        role: string;
        is_active: boolean;
        last_login_at: Date | null;
    } | null>;
}
