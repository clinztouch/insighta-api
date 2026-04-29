import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const version = req.headers['x-api-version'];

    if (!version) {
      return res.status(400).json({
        status: 'error',
        message: 'API version header required',
      });
    }

    if (version !== '1') {
      return res.status(400).json({
        status: 'error',
        message: 'Unsupported API version',
      });
    }

    next();
  }
}