import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ is_blocked: false, is_past_due: false, message: null });

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';
  const res = await fetch(`${backendUrl}/me/subscription-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return NextResponse.json({ is_blocked: false, is_past_due: false, message: null });
  return NextResponse.json(await res.json());
}
