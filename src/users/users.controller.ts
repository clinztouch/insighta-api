import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller('api/users')
export class UsersController {
  @Get('me')
  getMe(@Req() req: Request) {
    return {
      status: 'success',
      data: req.user,
    };
  }
}