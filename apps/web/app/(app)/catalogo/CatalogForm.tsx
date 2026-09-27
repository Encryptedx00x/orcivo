'use client';

import { useFormState, useFormStatus } from 'react-dom';

type FormState = { error: string };

export function CatalogForm({ action, children }: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, { error: '' });
  return (
    <form action={formAction}>
      {state.error && <p role="alert" style={{ color: '#B91C1C', fontSize: 14 }}>{state.error}</p>}
      <FormFields>{children}</FormFields>
    </form>
  );
}

function FormFields({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {children}
      {pending && <p role="status">Salvando item…</p>}
    </fieldset>
  );
}
