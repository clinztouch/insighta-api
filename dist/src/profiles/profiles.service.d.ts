import { GetProfilesDto } from './dto/get-profiles.dto';
import { PrismaService } from "../prisma/prisma.service";
export declare class ProfilesService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfiles(query: GetProfilesDto, baseUrl?: string): Promise<{
        status: string;
        page: number;
        limit: number;
        total: number;
        total_pages: number;
        links: {
            self: string;
            next: string | null;
            prev: string | null;
        };
        data: {
            gender: string;
            age_group: string;
            country_id: string;
            age: number;
            created_at: Date;
            gender_probability: number;
            id: string;
            name: string;
            country_name: string;
            country_probability: number;
        }[];
    }>;
    getProfile(id: string): Promise<{
        status: string;
        data: {
            gender: string;
            age_group: string;
            country_id: string;
            age: number;
            created_at: Date;
            gender_probability: number;
            id: string;
            name: string;
            country_name: string;
            country_probability: number;
        };
    }>;
    searchProfiles(q: string, query: GetProfilesDto): Promise<{
        status: string;
        page: number;
        limit: number;
        total: number;
        total_pages: number;
        links: {
            self: string;
            next: string | null;
            prev: string | null;
        };
        data: {
            gender: string;
            age_group: string;
            country_id: string;
            age: number;
            created_at: Date;
            gender_probability: number;
            id: string;
            name: string;
            country_name: string;
            country_probability: number;
        }[];
    } | {
        status: string;
        message: string;
    }>;
    createProfile(name: string): Promise<{
        status: string;
        data: {
            gender: string;
            age_group: string;
            country_id: string;
            age: number;
            created_at: Date;
            gender_probability: number;
            id: string;
            name: string;
            country_name: string;
            country_probability: number;
        };
    }>;
    exportProfilesCsv(query: GetProfilesDto): Promise<string>;
}
