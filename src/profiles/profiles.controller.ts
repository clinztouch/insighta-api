import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { GetProfilesDto } from './dto/get-profiles.dto';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import type { Response } from 'express';

@Controller('api/profiles')
@UseGuards(RolesGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('search')
  searchProfiles(@Query('q') q: string, @Query() query: GetProfilesDto) {
    return this.profilesService.searchProfiles(q, query);
  }

  @Get('export')
  async exportProfiles(@Query() query: GetProfilesDto, @Res() res: Response) {
    const csv = await this.profilesService.exportProfilesCsv(query);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="profiles_${timestamp}.csv"`,
    );
    return res.send(csv);
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.profilesService.getProfile(id);
  }

  @Get()
  getProfiles(@Query() query: GetProfilesDto) {
    return this.profilesService.getProfiles(query);
  }

  @Post()
  @Roles('admin')
  createProfile(@Body('name') name: string) {
    return this.profilesService.createProfile(name);
  }
}