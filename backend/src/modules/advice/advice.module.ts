import { Module } from '@nestjs/common';
import { AdviceController } from './advice.controller';
import { AdviceService } from './advice.service';

@Module({
  controllers: [AdviceController],
  providers: [AdviceService],
  exports: [AdviceService],
})
export class AdviceModule {}
