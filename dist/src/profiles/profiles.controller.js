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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilesController = void 0;
const common_1 = require("@nestjs/common");
const profiles_service_1 = require("./profiles.service");
const get_profiles_dto_1 = require("./dto/get-profiles.dto");
const roles_decorator_1 = require("../auth/roles.decorator");
const roles_guard_1 = require("../auth/roles.guard");
let ProfilesController = class ProfilesController {
    profilesService;
    constructor(profilesService) {
        this.profilesService = profilesService;
    }
    searchProfiles(q, query) {
        return this.profilesService.searchProfiles(q, query);
    }
    async exportProfiles(query, res) {
        const csv = await this.profilesService.exportProfilesCsv(query);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="profiles_${timestamp}.csv"`);
        return res.send(csv);
    }
    getProfile(id) {
        return this.profilesService.getProfile(id);
    }
    getProfiles(query) {
        return this.profilesService.getProfiles(query);
    }
    createProfile(name) {
        return this.profilesService.createProfile(name);
    }
};
exports.ProfilesController = ProfilesController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, get_profiles_dto_1.GetProfilesDto]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "searchProfiles", null);
__decorate([
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_profiles_dto_1.GetProfilesDto, Object]),
    __metadata("design:returntype", Promise)
], ProfilesController.prototype, "exportProfiles", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_profiles_dto_1.GetProfilesDto]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "getProfiles", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "createProfile", null);
exports.ProfilesController = ProfilesController = __decorate([
    (0, common_1.Controller)('api/profiles'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [profiles_service_1.ProfilesService])
], ProfilesController);
//# sourceMappingURL=profiles.controller.js.map