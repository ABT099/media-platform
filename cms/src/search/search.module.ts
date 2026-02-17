import { Module, Global } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchIndexListener } from './search-index.listener';

@Global()
@Module({
  providers: [SearchService, SearchIndexListener],
  exports: [SearchService],
})
export class SearchModule {}
