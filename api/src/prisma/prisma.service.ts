import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private enabled = false;

  constructor(private readonly configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL') || undefined,
        },
      },
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    const url = this.configService.get<string>('DATABASE_URL')?.trim();
    if (!url) {
      this.logger.warn(
        'DATABASE_URL no configurada; Prisma queda deshabilitado',
      );
      this.enabled = false;
      return;
    }
    if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
      this.logger.warn(
        'DATABASE_URL inválida para Prisma; debe empezar con postgresql:// o postgres://',
      );
      this.enabled = false;
      return;
    }
    try {
      await this.$connect();
      this.enabled = true;
      this.logger.log('Prisma conectado a Postgres');
    } catch (error) {
      this.enabled = false;
      this.logger.warn(
        `Prisma no pudo conectar a Postgres: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.enabled) {
      await this.$disconnect();
    }
  }

  isEnabled() {
    return this.enabled;
  }
}
