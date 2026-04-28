import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GlobalAuthGuard } from './auth/global-auth.guard';
import { ApiVersionMiddleware } from './common/middleware/api-version.middleware';
import { LoggingInterceptor } from './common/middleware/interceptors/logging.interceptor';

@Module({
  imports: [
    PrismaModule,
    ProfilesModule,
    AuthModule,
    UsersModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 60 },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: GlobalAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(ApiVersionMiddleware)
    .forRoutes('api/*path');
  }
}