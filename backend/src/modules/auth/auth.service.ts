import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// Authentication is now handled by Supabase
// This service is kept for potential future auth-related operations
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}
}
