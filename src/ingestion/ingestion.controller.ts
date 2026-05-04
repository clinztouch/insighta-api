import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestionService, SkipReasons } from './ingestion.service';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { diskStorage } from 'multer';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Controller('api/profiles/import')
@UseGuards(RolesGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      // ── FIX: diskStorage instead of memoryStorage ──
      // memoryStorage() loads the entire file into memory as a Buffer.
      // diskStorage() writes the upload to a temp file on disk so the
      // service can open it as a ReadStream — true streaming, no RAM spike.
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, _file, cb) => {
          // Unique temp filename to support concurrent uploads safely
          cb(null, `insighta-import-${randomUUID()}.csv`);
        },
      }),
      limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.csv$/i)) {
          return cb(new BadRequestException('Only CSV files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async importCsv(@UploadedFile() file: Express.Multer.File): Promise<{
    status: string;
    total_rows: number;
    inserted: number;
    skipped: number;
    reasons: SkipReasons;
  }> {
    if (!file) throw new BadRequestException('No file uploaded');

    try {
      // Pass the temp file path — service streams it directly from disk
      return await this.ingestionService.processCsv(file.path);
    } finally {
      // Always clean up the temp file, even if processing throws
      await unlink(file.path).catch(() => {
        // Non-fatal — OS will clean up /tmp eventually
      });
    }
  }
}