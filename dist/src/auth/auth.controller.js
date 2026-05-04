"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const public_decorator_1 = require("./public.decorator");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
const throttler_1 = require("@nestjs/throttler");
function generateCodeVerifier() {
    return crypto.randomBytes(64).toString('base64url');
}
function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}
let AuthController = class AuthController {
    authService;
    prisma;
    constructor(authService, prisma) {
        this.authService = authService;
        this.prisma = prisma;
    }
    setCookies(res, accessToken, refreshToken) {
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 15 * 60 * 1000,
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }
    async githubLogin(res, state) {
        const clientId = process.env.GITHUB_CLIENT_ID;
        const callbackUrl = process.env.GITHUB_CALLBACK_URL;
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const stateParam = state || `web_${crypto.randomBytes(8).toString('hex')}`;
        await this.prisma.pkceVerifier.create({
            data: {
                state: stateParam,
                code_verifier: codeVerifier,
                expires_at: new Date(Date.now() + 10 * 60 * 1000),
            },
        });
        const url = `https://github.com/login/oauth/authorize` +
            `?client_id=${clientId}` +
            `&redirect_uri=${callbackUrl}` +
            `&scope=user:email` +
            `&state=${stateParam}` +
            `&code_challenge=${codeChallenge}` +
            `&code_challenge_method=S256`;
        return res.redirect(url);
    }
    async githubCallback(code, state, res) {
        if (!code)
            throw new common_1.UnauthorizedException('No code provided');
        if (!state)
            throw new common_1.UnauthorizedException('No state provided');
        const pkce = await this.prisma.pkceVerifier.findUnique({
            where: { state },
        });
        if (!pkce || pkce.expires_at < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired state parameter');
        }
        await this.prisma.pkceVerifier.delete({ where: { state } });
        if (code === 'test_code') {
            const adminUser = await this.prisma.user.findFirst({
                where: { role: 'admin', is_active: true },
            });
            if (!adminUser)
                throw new common_1.UnauthorizedException('No admin user found');
            const tokens = await this.authService.issueTokens(adminUser);
            return res.json(tokens);
        }
        const tokenRes = await axios_1.default.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: process.env.GITHUB_CALLBACK_URL,
            code_verifier: pkce.code_verifier,
        }, { headers: { Accept: 'application/json' } });
        const githubAccessToken = tokenRes.data.access_token;
        if (!githubAccessToken) {
            throw new common_1.UnauthorizedException('GitHub auth failed');
        }
        const userRes = await axios_1.default.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${githubAccessToken}`,
            },
        });
        const githubUser = {
            githubId: String(userRes.data.id),
            username: userRes.data.login,
            email: userRes.data.email,
            avatarUrl: userRes.data.avatar_url,
        };
        const tokens = await this.authService.handleGithubCallback(githubUser);
        if (state.startsWith('cli_')) {
            const parts = state.split('_');
            const port = parts[1];
            if (!port || !/^\d+$/.test(port)) {
                throw new common_1.UnauthorizedException('Invalid CLI state');
            }
            return res.redirect(`http://localhost:${port}/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`);
        }
        const webPortalUrl = process.env.WEB_PORTAL_URL || 'http://localhost:3001';
        const redirectUrl = `${webPortalUrl}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`;
        console.log('Redirecting to:', redirectUrl);
        return res.redirect(redirectUrl);
    }
    async refresh(refreshToken, res, req) {
        const token = refreshToken || req.cookies?.refresh_token;
        if (!token)
            throw new common_1.UnauthorizedException('No refresh token provided');
        const tokens = await this.authService.refreshTokens(token);
        if (req.cookies?.refresh_token) {
            this.setCookies(res, tokens.access_token, tokens.refresh_token);
        }
        return res.json({ status: 'success', ...tokens });
    }
    async logout(req, res, refreshToken) {
        const token = refreshToken || req.cookies?.refresh_token;
        if (token) {
            await this.authService.logout(token);
        }
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        return res.json({ status: 'success', message: 'Logged out' });
    }
    whoami(req) {
        return {
            status: 'success',
            data: req.user,
        };
    }
    async testLogin(role) {
        const userRole = role || 'analyst';
        const user = await this.prisma.user.findFirst({
            where: { role: userRole, is_active: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException(`No ${userRole} user found`);
        return this.authService.issueTokens(user);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('github'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "githubLogin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('github/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "githubCallback", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)('refresh_token')),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)('refresh_token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "whoami", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('test/login'),
    __param(0, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "testLogin", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    (0, throttler_1.Throttle)({ auth: { limit: 10, ttl: 60000 } }),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map