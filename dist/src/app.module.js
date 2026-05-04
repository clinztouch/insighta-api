"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const profiles_module_1 = require("./profiles/profiles.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const global_auth_guard_1 = require("./auth/global-auth.guard");
const api_version_middleware_1 = require("./common/middleware/api-version.middleware");
const logging_interceptor_1 = require("./common/middleware/interceptors/logging.interceptor");
const cache_module_1 = require("./cache/cache.module");
const ingestion_module_1 = require("./ingestion/ingestion.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(api_version_middleware_1.ApiVersionMiddleware).forRoutes('api/*path');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            cache_module_1.CacheModule,
            ingestion_module_1.IngestionModule,
            prisma_module_1.PrismaModule,
            profiles_module_1.ProfilesModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            throttler_1.ThrottlerModule.forRoot([
                { name: 'default', ttl: 60000, limit: 60 },
                { name: 'auth', ttl: 60000, limit: 10 },
            ]),
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            { provide: core_1.APP_GUARD, useClass: global_auth_guard_1.GlobalAuthGuard },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: logging_interceptor_1.LoggingInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map