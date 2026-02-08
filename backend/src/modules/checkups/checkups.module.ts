import { Module } from '@nestjs/common';
import { CheckupsController } from './checkups.controller';
import { CheckupsService } from './checkups.service';

@Module({
  controllers: [CheckupsController],
  providers: [CheckupsService],
  exports: [CheckupsService],
})
export class CheckupsModule {}
