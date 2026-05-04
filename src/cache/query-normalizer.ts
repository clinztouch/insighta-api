import { GetProfilesDto } from 'src/profiles/dto/get-profiles.dto';

/**
 * Normalizes a filter object into a canonical cache key.
 * Rules:
 * - All string values are lowercased
 * - Keys are sorted alphabetically
 * - Pagination (page, limit) and sort params are excluded from the key
 *   because the same filters with different pages share the same dataset
 *   but we cache per-page results, so page IS included
 * - undefined/null values are excluded
 */
export function normalizeQueryKey(query: GetProfilesDto): string {
  const relevant: Record<string, string | number> = {};

  // String filters — lowercase for consistency
  if (query.gender)     relevant['gender']     = query.gender.toLowerCase();
  if (query.age_group)  relevant['age_group']  = query.age_group.toLowerCase();
  if (query.country_id) relevant['country_id'] = query.country_id.toUpperCase();

  // Numeric filters
  if (query.min_age !== undefined && query.min_age !== null)
    relevant['min_age'] = Number(query.min_age);
  if (query.max_age !== undefined && query.max_age !== null)
    relevant['max_age'] = Number(query.max_age);
  if (query.min_gender_probability !== undefined && query.min_gender_probability !== null)
    relevant['min_gender_prob'] = Number(query.min_gender_probability);
  if (query.min_country_probability !== undefined && query.min_country_probability !== null)
    relevant['min_country_prob'] = Number(query.min_country_probability);

  // Pagination and sort — included so different pages cache separately
  relevant['page']  = Number(query.page ?? 1);
  relevant['limit'] = Math.min(Number(query.limit ?? 10), 50);
  if (query.sort_by) relevant['sort_by'] = query.sort_by.toLowerCase();
  if (query.order)   relevant['order']   = query.order.toLowerCase();

  // Sort keys alphabetically → deterministic key regardless of insertion order
  const sorted = Object.keys(relevant)
    .sort()
    .map((k) => `${k}:${relevant[k]}`)
    .join('|');

  return `profiles:${sorted}`;
}