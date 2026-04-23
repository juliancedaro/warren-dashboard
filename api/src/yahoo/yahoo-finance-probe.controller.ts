import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
} from '@nestjs/common';
import { YahooFinanceProbeService } from './yahoo-finance-probe.service';

@Controller('market')
export class YahooFinanceProbeController {
  constructor(private readonly yahoo: YahooFinanceProbeService) {}

  /** Prueba: cotización + histórico reciente + extractos de quoteSummary + ADR 20d calculado. */
  @Get('yahoo/:symbol')
  async probe(@Param('symbol') symbol: string) {
    const s = symbol?.trim();
    if (!s) {
      throw new BadRequestException('symbol is required');
    }
    try {
      return await this.yahoo.probe(s);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new InternalServerErrorException({
        message: 'Yahoo Finance falló (rate limit, símbolo o cambio de API)',
        detail: msg,
      });
    }
  }
}
