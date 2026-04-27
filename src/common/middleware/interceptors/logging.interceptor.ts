import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";





@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
       const req = context.switchToHttp().getRequest();
       const { method, url } = req;
       const start = Date.now();

        return next.handle().pipe(
            tap(() => {
                const res = context.switchToHttp().getResponse();
                const statusCode = res.statusCode;
                const responseTime = Date.now() - start;
                this.logger.log(`${method} ${url} ${statusCode} ${responseTime}ms`);
            }),
        );
    }
}