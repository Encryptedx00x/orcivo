import { catalogService, CatalogItem } from '../../../lib/catalog.service';
import { CatalogoContent } from './CatalogoContent';

export default async function CatalogoPage(): Promise<JSX.Element> {
  let items: CatalogItem[] = [];
  try {
    items = await catalogService.fetchCatalog(false);
  } catch {}
  return <CatalogoContent items={items} />;
}
