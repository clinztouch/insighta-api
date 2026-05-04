import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { PrismaService } from "../prisma/prisma.service";
export declare class AuthController {
    private authService;
    private prisma;
    constructor(authService: AuthService, prisma: PrismaService);
    private setCookies;
    githubLogin(res: Response, state?: string): Promise<void>;
    githubCallback(code: string, state: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
    refresh(refreshToken: string, res: Response, req: Request): Promise<Response<any, Record<string, any>>>;
    logout(req: Request, res: Response, refreshToken?: string): Promise<Response<any, Record<string, any>>>;
    whoami(req: Request): {
        status: string;
        data: Express.User | undefined;
    };
    testLogin(role: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
}
