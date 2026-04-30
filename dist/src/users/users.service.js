"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByGithubId(githubId) {
        return this.prisma.user.findUnique({ where: { github_id: githubId } });
    }
    async findById(id) {
        return this.prisma.user.findUnique({ where: { id } });
    }
    async findOrCreate(data) {
        const existing = await this.findByGithubId(data.githubId);
        if (existing) {
            return this.prisma.user.update({
                where: { id: existing.id },
                data: { last_login_at: new Date() },
            });
        }
        return this.prisma.user.create({
            data: {
                github_id: data.githubId,
                username: data.username,
                email: data.email,
                avatar_url: data.avatarUrl,
                role: 'analyst',
                is_active: true,
                last_login_at: new Date(),
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map