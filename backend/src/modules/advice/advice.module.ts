import { Module } from '@nestjs/common';
import { AdviceController } from './advice.controller';
import { AdviceService } from './advice.service';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [AdviceController],
  providers: [AdviceService],
  exports: [AdviceService],
})
export class AdviceModule {}
