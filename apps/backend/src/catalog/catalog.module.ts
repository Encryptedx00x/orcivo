import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [StorageModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
