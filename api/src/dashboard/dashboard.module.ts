import { Module } from '@nestjs/common';
import { YahooFinanceModule } from '../yahoo/yahoo-finance.module';
import { DashboardService } from './dashboard.service';
import { HeatmapService } from './heatmap.service';
import { DashboardController } from './dashboard.controller';
import { SymbolSnapshotService } from './symbol-snapshot.service';

@Module({
  imports: [YahooFinanceModule],
  controllers: [DashboardController],
  providers: [DashboardService, HeatmapService, SymbolSnapshotService],
})
export class DashboardModule {}
