import { Injectable, NotFoundException } from '@nestjs/common';
import { GetProfilesDto } from './dto/get-profiles.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async getProfiles(query: GetProfilesDto, baseUrl = '/api/profiles') {
    const where: Prisma.ProfileWhereInput = {};

    if (query.gender) where.gender = query.gender;
    if (query.age_group) where.age_group = query.age_group;
    if (query.country_id) where.country_id = query.country_id;

    if (query.min_age || query.max_age) {
      where.age = {
        ...(query.min_age && { gte: query.min_age }),
        ...(query.max_age && { lte: query.max_age }),
      };
    }

    if (query.min_gender_probability) {
      where.gender_probability = { gte: query.min_gender_probability };
    }

    if (query.min_country_probability) {
      where.country_probability = { gte: query.min_country_probability };
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 50);
    const skip = (page - 1) * limit;

    const orderBy: Prisma.ProfileOrderByWithRelationInput = query.sort_by
      ? { [query.sort_by]: (query.order ?? 'asc') as 'asc' | 'desc' }
      : { created_at: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.profile.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.profile.count({ where }),
    ]);

    const total_pages = Math.ceil(total / limit);

    // Build query string from filters
    const params = new URLSearchParams();
    if (query.gender) params.set('gender', query.gender);
    if (query.age_group) params.set('age_group', query.age_group);
    if (query.country_id) params.set('country_id', query.country_id);
    if (query.min_age) params.set('min_age', String(query.min_age));
    if (query.max_age) params.set('max_age', String(query.max_age));
    if (query.sort_by) params.set('sort_by', query.sort_by);
    if (query.order) params.set('order', query.order);
    params.set('limit', String(limit));

    const buildLink = (p: number) => {
      params.set('page', String(p));
      return `${baseUrl}?${params.toString()}`;
    };

    return {
      status: 'success',
      page,
      limit,
      total,
      total_pages,
      links: {
        self: buildLink(page),
        next: page < total_pages ? buildLink(page + 1) : null,
        prev: page > 1 ? buildLink(page - 1) : null,
      },
      data,
    };
  }

  async getProfile(id: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Profile not found');
    return { status: 'success', data: profile };
  }

  async searchProfiles(q: string, query: GetProfilesDto) {
    if (!q || !q.trim()) {
      return { status: 'error', message: 'Unable to interpret query' };
    }

    const input = q.toLowerCase().trim();
    const filters: Partial<GetProfilesDto> = {};

    if (/\bmales?\b/.test(input)) filters.gender = 'male';
    else if (/\bfemales?\b/.test(input)) filters.gender = 'female';
    else if (/\bmen\b/.test(input)) filters.gender = 'male';
    else if (/\bwomen\b/.test(input)) filters.gender = 'female';

    if (/\bchildren\b|\bchild\b|\bkids?\b/.test(input))
      filters.age_group = 'child';
    else if (/\bteenagers?\b|\bteens?\b/.test(input))
      filters.age_group = 'teenager';
    else if (/\badults?\b/.test(input)) filters.age_group = 'adult';
    else if (/\bseniors?\b|\belderly\b/.test(input))
      filters.age_group = 'senior';

    if (/\byoung\b/.test(input)) {
      filters.min_age = 16;
      filters.max_age = 24;
    }

    const aboveMatch = input.match(/\babove\s+(\d+)/);
    const belowMatch = input.match(/\bbelow\s+(\d+)/);
    const olderMatch = input.match(/\bolder\s+than\s+(\d+)/);
    const youngerMatch = input.match(/\byounger\s+than\s+(\d+)/);
    const betweenMatch = input.match(/\bbetween\s+(\d+)\s+and\s+(\d+)/);

    if (aboveMatch) filters.min_age = parseInt(aboveMatch[1]);
    if (belowMatch) filters.max_age = parseInt(belowMatch[1]);
    if (olderMatch) filters.min_age = parseInt(olderMatch[1]);
    if (youngerMatch) filters.max_age = parseInt(youngerMatch[1]);
    if (betweenMatch) {
      filters.min_age = parseInt(betweenMatch[1]);
      filters.max_age = parseInt(betweenMatch[2]);
    }

    const countryMap: Record<string, string> = {
      nigeria: 'NG', ghana: 'GH', kenya: 'KE', ethiopia: 'ET',
      tanzania: 'TZ', uganda: 'UG', senegal: 'SN', angola: 'AO',
      rwanda: 'RW', cameroon: 'CM', 'south africa': 'ZA', egypt: 'EG',
      morocco: 'MA', tunisia: 'TN', algeria: 'DZ', mozambique: 'MZ',
      zambia: 'ZM', zimbabwe: 'ZW', mali: 'ML', niger: 'NE',
      chad: 'TD', sudan: 'SD', somalia: 'SO', madagascar: 'MG',
      'ivory coast': 'CI', "côte d'ivoire": 'CI', benin: 'BJ',
      togo: 'TG', guinea: 'GN', india: 'IN', australia: 'AU',
      'united kingdom': 'GB', uk: 'GB', usa: 'US', 'united states': 'US',
    };

    for (const [countryName, code] of Object.entries(countryMap)) {
      if (input.includes(countryName)) {
        filters.country_id = code;
        break;
      }
    }

    const hasFilters =
      filters.gender ||
      filters.age_group ||
      filters.country_id ||
      filters.min_age ||
      filters.max_age;

    if (!hasFilters) {
      return { status: 'error', message: 'Unable to interpret query' };
    }

    const merged: GetProfilesDto = {
      ...filters,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    };

    return this.getProfiles(merged, '/api/profiles/search');
  }

  async createProfile(name: string) {
    // Fetch gender prediction
    const [genderRes, nationalizeRes] = await Promise.all([
      axios.get(`https://api.genderize.io/?name=${encodeURIComponent(name)}`),
      axios.get(`https://api.nationalize.io/?name=${encodeURIComponent(name)}`),
    ]);

    const gender = genderRes.data.gender || 'unknown';
    const gender_probability = genderRes.data.probability || 0;

    const topCountry = nationalizeRes.data.country?.[0];
    const country_id = topCountry?.country_id || 'UN';
    const country_probability = topCountry?.probability || 0;

    // Fetch age prediction
    const ageRes = await axios.get(
      `https://api.agify.io/?name=${encodeURIComponent(name)}`,
    );
    const age = ageRes.data.age || 25;

    const age_group =
      age < 13 ? 'child' :
      age < 18 ? 'teenager' :
      age < 65 ? 'adult' : 'senior';

    // Get country name
    let country_name = country_id;
    try {
      const countryRes = await axios.get(
        `https://restcountries.com/v3.1/alpha/${country_id}`,
      );
      country_name = countryRes.data?.[0]?.name?.common || country_id;
    } catch {
      country_name = country_id;
    }

    const { v7: uuidv7 } = await import('uuid');
    const profile = await this.prisma.profile.create({
      data: {
        id: uuidv7(),
        name,
        gender,
        gender_probability,
        age,
        age_group,
        country_id,
        country_name,
        country_probability,
      },
    });

    return { status: 'success', data: profile };
  }

  async exportProfilesCsv(query: GetProfilesDto): Promise<string> {
    const where: Prisma.ProfileWhereInput = {};

    if (query.gender) where.gender = query.gender;
    if (query.age_group) where.age_group = query.age_group;
    if (query.country_id) where.country_id = query.country_id;

    if (query.min_age || query.max_age) {
      where.age = {
        ...(query.min_age && { gte: query.min_age }),
        ...(query.max_age && { lte: query.max_age }),
      };
    }

    const orderBy: Prisma.ProfileOrderByWithRelationInput = query.sort_by
      ? { [query.sort_by]: (query.order ?? 'asc') as 'asc' | 'desc' }
      : { created_at: 'desc' };

    const profiles = await this.prisma.profile.findMany({ where, orderBy });

    const headers = [
      'id', 'name', 'gender', 'gender_probability', 'age',
      'age_group', 'country_id', 'country_name', 'country_probability', 'created_at',
    ];

    const rows = profiles.map((p) =>
      [
        p.id, p.name, p.gender, p.gender_probability, p.age,
        p.age_group, p.country_id, p.country_name, p.country_probability,
        p.created_at.toISOString(),
      ].join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}