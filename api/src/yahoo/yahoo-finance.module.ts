import { Module } from '@nestjs/common';
import { YahooFinanceProbeService } from './yahoo-finance-probe.service';
import { YahooFinanceProbeController } from './yahoo-finance-probe.controller';
import { YahooMarketService } from './yahoo-market.service';

@Module({
  controllers: [YahooFinanceProbeController],
  providers: [YahooFinanceProbeService, YahooMarketService],
  exports: [YahooMarketService],
})
export class YahooFinanceModule {}
