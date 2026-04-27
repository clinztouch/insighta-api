import { BadRequestException, Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction } from "express";


@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        
        const version = req.headers['x-api-version'];
        if (!version) {
            throw new BadRequestException('API version header required');
        }
        next();
    }
}