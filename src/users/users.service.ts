import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}


  async findByGithubId(githubId: string) {
    return this.prisma.user.findUnique({ where: { github_id: githubId } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
}

async findOrCreate(data: {
    githubId: string;
    username: string;
    email?: string;
    avatarUrl?: string;
}) {
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
}