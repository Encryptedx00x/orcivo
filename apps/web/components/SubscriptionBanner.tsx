'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface SubStatus {
  is_blocked: boolean;
  is_past_due: boolean;
  message: string | null;
}

export function SubscriptionBanner(): JSX.Element | null {
  const [status, setStatus] = useState<SubStatus | null>(null);

  useEffect(() => {
    fetch('/api/me/subscription-status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status?.is_blocked && !status?.is_past_due) return null;

  const colorClass = status.is_blocked ? 'bg-red-600' : 'bg-amber-500';

  return (
    <div className={`${colorClass} text-white px-4 py-3 flex items-center gap-3`}>
      <AlertTriangle size={16} />
      <span className="text-sm flex-1">{status.message}</span>
      <Link href="https://orcivo.com.br/planos" className="text-sm font-semibold underline whitespace-nowrap">
        Ver planos
      </Link>
    </div>
  );
}
