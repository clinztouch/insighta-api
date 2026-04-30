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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const users_service_1 = require("../users/users.service");
const crypto = __importStar(require("crypto"));
let AuthService = class AuthService {
    prisma;
    userService;
    jwtService;
    constructor(prisma, userService, jwtService) {
        this.prisma = prisma;
        this.userService = userService;
        this.jwtService = jwtService;
    }
    async handleGithubCallback(githubUser) {
        const user = await this.userService.findOrCreate(githubUser);
        if (!user.is_active) {
            throw new common_1.ForbiddenException('Account is deactivated');
        }
        return this.issueTokens(user);
    }
    async issueTokens(user) {
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
    async refreshTokens(refreshToken) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!stored || stored.is_used || stored.expires_at < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        if (!stored.user.is_active) {
            throw new common_1.ForbiddenException('Account is deactivated');
        }
        await this.prisma.refreshToken.update({
            where: { id: stored.id },
            data: { is_used: true },
        });
        return this.issueTokens(stored.user);
    }
    async logout(refreshToken) {
        await this.prisma.refreshToken.updateMany({
            where: { token: refreshToken, is_used: false },
            data: { is_used: true },
        });
    }
    async validateUser(userId) {
        const user = await this.userService.findById(userId);
        if (!user || !user.is_active)
            return null;
        return user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map