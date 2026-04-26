import { Controller, Get, Query } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { GetProfilesDto } from './dto/get-profiles.dto';
@Controller('api/profiles')
export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) {}

      @Get('search')
  searchProfiles(@Query('q') q: string, @Query() query: GetProfilesDto) {
    return this.profilesService.searchProfiles(q, query);
  }

    @Get()
    getProfiles(@Query() query: GetProfilesDto) {
        return this.profilesService.getProfiles(query);
    }
}
