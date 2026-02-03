import { Module } from '@nestjs/common';
import { WhitelistController } from './whitelist.controller';
import { WhitelistService } from './whitelist.service';
import { AdminGuard } from './guards/admin.guard';

@Module({
  controllers: [WhitelistController],
  providers: [WhitelistService, AdminGuard],
  exports: [WhitelistService],
})
export class WhitelistModule {}
