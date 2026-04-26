import { Injectable } from '@nestjs/common';
import { GetProfilesDto } from './dto/get-profiles.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async getProfiles(query: GetProfilesDto) {
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

    return { status: 'success', page, limit, total, data };
  }

  async searchProfiles(q: string, query: GetProfilesDto) {
  if (!q || !q.trim()) {
    return { status: 'error', message: 'Unable to interpret query' };
  }

  const input = q.toLowerCase().trim();
  const filters: Partial<GetProfilesDto> = {};

  // Gender
  if (/\bmales?\b/.test(input)) filters.gender = 'male';
  else if (/\bfemales?\b/.test(input)) filters.gender = 'female';
  else if (/\bmen\b/.test(input)) filters.gender = 'male';
  else if (/\bwomen\b/.test(input)) filters.gender = 'female';

  // Age group
  if (/\bchildren\b|\bchild\b|\bkids?\b/.test(input)) filters.age_group = 'child';
  else if (/\bteenagers?\b|\bteens?\b/.test(input)) filters.age_group = 'teenager';
  else if (/\badults?\b/.test(input)) filters.age_group = 'adult';
  else if (/\bseniors?\b|\belderly\b/.test(input)) filters.age_group = 'senior';

  // "young" maps to ages 16-24 (per task spec)
  if (/\byoung\b/.test(input)) {
    filters.min_age = 16;
    filters.max_age = 24;
  }

  // Age ranges
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

  // Country mapping
  const countryMap: Record<string, string> = {
    nigeria: 'NG', ghana: 'GH', kenya: 'KE', ethiopia: 'ET',
    tanzania: 'TZ', uganda: 'UG', senegal: 'SN', angola: 'AO',
    rwanda: 'RW', cameroon: 'CM', 'south africa': 'ZA', egypt: 'EG',
    morocco: 'MA', tunisia: 'TN', algeria: 'DZ', mozambique: 'MZ',
    zambia: 'ZM', zimbabwe: 'ZW', mali: 'ML', niger: 'NE',
    chad: 'TD', sudan: 'SD', somalia: 'SO', madagascar: 'MG',
    'ivory coast': 'CI', 'côte d\'ivoire': 'CI', benin: 'BJ',
    togo: 'TG', guinea: 'GN', india: 'IN', australia: 'AU',
    'united kingdom': 'GB', uk: 'GB', usa: 'US', 'united states': 'US',
  };

  for (const [countryName, code] of Object.entries(countryMap)) {
    if (input.includes(countryName)) {
      filters.country_id = code;
      break;
    }
  }

  // If no filters were extracted, return error
  const hasFilters = filters.gender || filters.age_group || filters.country_id
    || filters.min_age || filters.max_age;

  if (!hasFilters) {
    return { status: 'error', message: 'Unable to interpret query' };
  }

  // Merge with pagination from query
  const merged: GetProfilesDto = {
    ...filters,
    page: query.page ?? 1,
    limit: query.limit ?? 10,
  };

  return this.getProfiles(merged);
}
}

