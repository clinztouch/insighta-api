import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './profiles.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheService } from 'src/cache/cache.service';

describe('ProfilesService', () => {
  let service: ProfilesService;

  //  mock CacheService so the test module can resolve it ──
  // ProfilesService now depends on CacheService via constructor injection.
  // Without this mock the NestJS DI container throws:
  //   "Nest can't resolve dependencies of ProfilesService (PrismaService, ?)"
  const mockCacheService: Partial<CacheService> = {
    get: jest.fn().mockResolvedValue(null),           // always cache miss
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: {} },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});