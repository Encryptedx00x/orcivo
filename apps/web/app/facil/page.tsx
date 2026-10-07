import type { Metadata } from 'next';
import { EasyApp } from './EasyApp';

export const metadata: Metadata = { title: 'Orcivo · Modo fácil' };

export default function FacilPage(): React.JSX.Element {
  return <EasyApp />;
}
