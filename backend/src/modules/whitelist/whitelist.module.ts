import { Module, OnModuleInit } from '@nestjs/common';
import { WhitelistController } from './whitelist.controller';
import { WhitelistService } from './whitelist.service';
import { AdminGuard } from './guards/admin.guard';

@Module({
  controllers: [WhitelistController],
  providers: [WhitelistService, AdminGuard],
  exports: [WhitelistService],
})
export class WhitelistModule implements OnModuleInit {
  constructor(private whitelistService: WhitelistService) {}

  async onModuleInit() {
    await this.whitelistService.syncAdminEmailsFromEnv();
  }
}
