import { PrismaService } from "../prisma/prisma.service";
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findByGithubId(githubId: string): Promise<{
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
    findById(id: string): Promise<{
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
    findOrCreate(data: {
        githubId: string;
        username: string;
        email?: string;
        avatarUrl?: string;
    }): Promise<{
        created_at: Date;
        id: string;
        github_id: string;
        username: string;
        email: string | null;
        avatar_url: string | null;
        role: string;
        is_active: boolean;
        last_login_at: Date | null;
    }>;
}
