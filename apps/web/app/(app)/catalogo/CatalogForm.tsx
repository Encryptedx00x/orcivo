'use client';

import { startTransition, useState } from 'react';

type FormState = { error: string };

export function CatalogForm({
  action,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
}): JSX.Element {
  const [state, setState] = useState<FormState>({ error: '' });
  const [pending, setPending] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    startTransition(() => {
      void action(state, formData)
        .then(setState)
        .finally(() => setPending(false));
    });
  }

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      {state.error && (
        <p role="alert" style={{ color: '#B91C1C', fontSize: 14 }}>
          {state.error}
        </p>
      )}
      <FormFields pending={pending}>{children}</FormFields>
    </form>
  );
}

function FormFields({ children, pending }: { children: React.ReactNode; pending: boolean }) {
  return (
    <fieldset
      disabled={pending}
      style={{
        border: 0,
        padding: 0,
        margin: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {children}
      {pending && <p role="status">Salvando item…</p>}
    </fieldset>
  );
}
