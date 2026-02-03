import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';

// Supabase JWT payload structure
export interface SupabaseJwtPayload {
  sub: string; // Supabase user ID
  email: string;
  aud: string;
  role: string;
  iat: number;
  exp: number;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('SUPABASE_JWT_SECRET');
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET is not defined');
    }
    console.log('JWT Strategy initialized with secret length:', secret.length);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // Use raw secret without base64 decode
    });
  }

  async validate(payload: SupabaseJwtPayload) {
    console.log('JWT validate called with payload:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.sub || !payload.email) {
      console.log('JWT validation failed: missing sub or email');
      throw new UnauthorizedException('无效的令牌');
    }

    // Find or create local user based on Supabase user ID
    let user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // If user doesn't exist, create one
    if (!user) {
      const name =
        payload.user_metadata?.full_name ||
        payload.user_metadata?.name ||
        payload.email.split('@')[0];

      user = await this.prisma.user.create({
        data: {
          id: payload.sub, // Use Supabase user ID
          email: payload.email,
          name,
          passwordHash: '', // Supabase users don't need password
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });
    }

    return user;
  }
}
