import { ProfilesService } from './profiles.service';
import { GetProfilesDto } from './dto/get-profiles.dto';
import type { Response } from 'express';
export declare class ProfilesController {
    private readonly profilesService;
    constructor(profilesService: ProfilesService);
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
    exportProfiles(query: GetProfilesDto, res: Response): Promise<Response<any, Record<string, any>>>;
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
    getProfiles(query: GetProfilesDto): Promise<{
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
}
