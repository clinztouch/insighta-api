import { ProfilesService } from './profiles.service';
import { GetProfilesDto } from './dto/get-profiles.dto';
import type { Response } from 'express';
export declare class ProfilesController {
    private readonly profilesService;
    constructor(profilesService: ProfilesService);
    searchProfiles(q: string, query: GetProfilesDto): Promise<any>;
    exportProfiles(query: GetProfilesDto, res: Response): Promise<Response<any, Record<string, any>>>;
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
    getProfiles(query: GetProfilesDto): Promise<any>;
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
}
