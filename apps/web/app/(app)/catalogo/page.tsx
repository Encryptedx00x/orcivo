import { catalogService } from '../../../lib/catalog.service';
import { CatalogoContent } from './CatalogoContent';

export default async function CatalogoPage(): Promise<React.JSX.Element> {
  const items = await catalogService.fetchCatalog(false);
  return <CatalogoContent items={items} />;
}
