import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { SettingsModule } from '../settings/settings.module';

@Global()
@Module({
  imports: [SettingsModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
