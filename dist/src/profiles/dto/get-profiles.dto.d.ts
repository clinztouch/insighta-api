export declare class GetProfilesDto {
    gender?: string;
    age_group?: string;
    country_id?: string;
    min_age?: number;
    max_age?: number;
    min_gender_probability?: number;
    min_country_probability?: number;
    sort_by?: 'age' | 'created_at' | 'gender_probability';
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
