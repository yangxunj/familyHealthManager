import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { WhitelistService } from '../whitelist.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private whitelistService: WhitelistService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.email) {
      throw new ForbiddenException('需要管理员权限');
    }

    if (!this.whitelistService.isAdmin(user.email)) {
      throw new ForbiddenException('需要管理员权限');
    }

    return true;
  }
}
