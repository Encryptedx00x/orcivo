import { Suspense } from 'react';
import NovoOrcamentoForm from './NovoOrcamentoForm';

export default function NovoOrcamentoPage(): React.JSX.Element {
  return (
    <Suspense>
      <NovoOrcamentoForm />
    </Suspense>
  );
}
