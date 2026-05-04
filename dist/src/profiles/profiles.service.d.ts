import { GetProfilesDto } from './dto/get-profiles.dto';
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
export declare class ProfilesService {
    private prisma;
    private cache;
    constructor(prisma: PrismaService, cache: CacheService);
    getProfiles(query: GetProfilesDto, baseUrl?: string): Promise<any>;
    searchProfiles(q: string, query: GetProfilesDto): Promise<any>;
    getProfile(id: string): Promise<{
        status: string;
        data: {
            id: string;
            name: string;
            gender: string;
            gender_probability: number;
            age: number;
            age_group: string;
            country_id: string;
            country_name: string;
            country_probability: number;
            created_at: Date;
        };
    }>;
    createProfile(name: string): Promise<{
        status: string;
        data: {
            id: string;
            name: string;
            gender: string;
            gender_probability: number;
            age: number;
            age_group: string;
            country_id: string;
            country_name: string;
            country_probability: number;
            created_at: Date;
        };
    }>;
    exportProfilesCsv(query: GetProfilesDto): Promise<string>;
}
