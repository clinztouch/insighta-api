import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheService } from 'src/cache/cache.service';
import { createReadStream } from 'fs';
import * as csv from 'fast-csv';
import { v7 as uuidv7 } from 'uuid';

const VALID_GENDERS = ['male', 'female', 'unknown'];
const VALID_AGE_GROUPS = ['child', 'teenager', 'adult', 'senior'];
const BATCH_SIZE = 500;

interface ParsedRow {
  name: string;
  gender: string;
  gender_probability: number;
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  country_probability: number;
}

export interface SkipReasons {
  duplicate_name: number;
  invalid_age: number;
  invalid_gender: number;
  invalid_age_group: number;
  missing_fields: number;
  malformed_row: number;
  [key: string]: number;
}

@Injectable()
export class IngestionService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  //  accepts a file path, not a Buffer ──
  async processCsv(filePath: string): Promise<{
    status: string;
    total_rows: number;
    inserted: number;
    skipped: number;
    reasons: SkipReasons;
  }> {
    const reasons: SkipReasons = {
      duplicate_name: 0,
      invalid_age: 0,
      invalid_gender: 0,
      invalid_age_group: 0,
      missing_fields: 0,
      malformed_row: 0,
    };

    let total_rows = 0;
    let inserted = 0;
    let batch: ParsedRow[] = [];

    //  flushBatch is now properly awaited with stream pausing ──
    // Previously flushBatch() was called inside the 'data' event handler
    // without awaiting, so the stream could end before all DB inserts
    // finished — causing wrong inserted/skipped counts.
    // Solution: pause the stream before flush, resume after.
    const flushBatch = async (
      rows: ParsedRow[],
      stream: csv.CsvParserStream<csv.ParserRow<any>, csv.ParserRow<any>>,
    ) => {
      if (rows.length === 0) return;

      //  deduplicate names within the batch itself ──
      // If the same name appears twice in one batch, the DB check
      // only catches the first occurrence. Dedup here before querying.
      const seen = new Set<string>();
      const deduped: ParsedRow[] = [];
      for (const row of rows) {
        if (seen.has(row.name)) {
          reasons.duplicate_name++;
        } else {
          seen.add(row.name);
          deduped.push(row);
        }
      }

      // Check for duplicates already in DB — one query for the whole batch
      const names = deduped.map((r) => r.name);
      const existing = await this.prisma.profile.findMany({
        where: { name: { in: names } },
        select: { name: true },
      });
      const existingNames = new Set(existing.map((e) => e.name));

      const toInsert = deduped.filter((r) => {
        if (existingNames.has(r.name)) {
          reasons.duplicate_name++;
          return false;
        }
        return true;
      });

      if (toInsert.length === 0) return;

      //  use result.count from createMany instead of toInsert.length ──
      // When skipDuplicates:true silently drops rows, toInsert.length
      // overcounts. result.count is the actual number of rows written.
      const result = await this.prisma.profile.createMany({
        data: toInsert.map((r) => ({
          id: uuidv7(),
          name: r.name,
          gender: r.gender,
          gender_probability: r.gender_probability,
          age: r.age,
          age_group: r.age_group,
          country_id: r.country_id,
          country_name: r.country_name,
          country_probability: r.country_probability,
        })),
        skipDuplicates: true,
      });

      inserted += result.count;

      // Any rows in toInsert that were silently skipped by skipDuplicates
      // are race-condition duplicates (concurrent upload). Count them.
      const raceSkipped = toInsert.length - result.count;
      if (raceSkipped > 0) {
        reasons.duplicate_name += raceSkipped;
      }
    };

    await new Promise<void>((resolve, reject) => {
      // ── FIX: stream from disk using createReadStream, not Readable.from(buffer) ──
      // Readable.from(buffer) still holds the full file in memory.
      // createReadStream opens the file and reads it in chunks — true streaming.
      const fileStream = createReadStream(filePath);

      const csvStream = csv.parse({ headers: true, trim: true });

      csvStream
        .on('error', (err) => {
          // CSV parse-level error — log but don't reject so partial results survive
          console.error('CSV parse error (non-fatal):', err.message);
          reasons.malformed_row++;
        })
        .on('data', (row: Record<string, string>) => {
          total_rows++;

          // ── FIX: wrap each row in try/catch so one bad row never kills the upload ──
          try {
            const name = row['name']?.trim();
            const gender = row['gender']?.trim().toLowerCase();
            const age_raw = row['age']?.trim();
            const age_group = row['age_group']?.trim().toLowerCase();
            const country_id = row['country_id']?.trim().toUpperCase();
            const country_name = row['country_name']?.trim();
            const gender_probability = parseFloat(row['gender_probability'] ?? '0');
            const country_probability = parseFloat(row['country_probability'] ?? '0');
            const age = parseInt(age_raw);

            if (!name || !gender || !age_raw || !age_group || !country_id || !country_name) {
              reasons.missing_fields++;
              return;
            }
            if (isNaN(age) || age < 0 || age > 150) {
              reasons.invalid_age++;
              return;
            }
            if (!VALID_GENDERS.includes(gender)) {
              reasons.invalid_gender++;
              return;
            }
            if (!VALID_AGE_GROUPS.includes(age_group)) {
              reasons.invalid_age_group++;
              return;
            }

            batch.push({
              name,
              gender,
              gender_probability: isNaN(gender_probability) ? 0 : gender_probability,
              age,
              age_group,
              country_id,
              country_name,
              country_probability: isNaN(country_probability) ? 0 : country_probability,
            });

            if (batch.length >= BATCH_SIZE) {
              const toFlush = [...batch];
              batch = [];

              //  pause stream before async flush, resume after ──
              // Without this the stream keeps emitting rows while the DB
              // insert is still running — batches overlap and the 'end'
              // event can fire before all inserts complete.
              csvStream.pause();
              flushBatch(toFlush, csvStream)
                .then(() => csvStream.resume())
                .catch((err) => {
                  reasons.malformed_row++;
                  console.error('Batch insert error (non-fatal):', err.message);
                  csvStream.resume();
                });
            }
          } catch (err) {
            reasons.malformed_row++;
          }
        })
        .on('end', async () => {
          try {
            // Flush the final partial batch — properly awaited here
            await flushBatch(batch, csvStream);
            batch = [];
            resolve();
          } catch (err) {
            reject(err);
          }
        });

      fileStream.on('error', reject);
      fileStream.pipe(csvStream);
    });

    const skipped = total_rows - inserted;

    //  invalidate profiles cache after bulk insert ──
    // Without this, GET /api/profiles returns stale cached results
    // for up to 5 minutes after a large CSV upload. Non-fatal if Redis
    // is unavailable — the TTL will expire naturally.
    await this.cache.invalidatePattern('profiles:').catch(() => {});

    return {
      status: 'success',
      total_rows,
      inserted,
      skipped,
      reasons,
    };
  }
}