"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiVersionMiddleware = void 0;
const common_1 = require("@nestjs/common");
let ApiVersionMiddleware = class ApiVersionMiddleware {
    use(req, res, next) {
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
};
exports.ApiVersionMiddleware = ApiVersionMiddleware;
exports.ApiVersionMiddleware = ApiVersionMiddleware = __decorate([
    (0, common_1.Injectable)()
], ApiVersionMiddleware);
//# sourceMappingURL=api-version.middleware.js.map