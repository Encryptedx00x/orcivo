import { AppSidebar } from '../../components/AppSidebar';
import { TopBar } from '../../components/TopBar';
import { SubscriptionBanner } from '../../components/SubscriptionBanner';
import { AuthProvider, type AuthState } from '../../components/AuthProvider';
import { MobileSidebarProvider } from '../../components/MobileSidebar';
import { EasyModeGlue } from '../../components/EasyMode';
import { apiFetch } from '../../lib/api';

interface SessionSummary {
  user: { name: string };
  company: { trade_name: string; plan_code: string };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  let auth: AuthState = { user: null, company: null };
  try {
    const s = await apiFetch<SessionSummary>('/dashboard/summary');
    auth = { user: s.user, company: s.company };
  } catch {}

  return (
    <AuthProvider value={auth}>
      <MobileSidebarProvider>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
          <AppSidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <SubscriptionBanner />
            <TopBar />
            <main className="ov-page" style={{ flex: 1 }}>
              {children}
            </main>
          </div>
        </div>
        <EasyModeGlue />
      </MobileSidebarProvider>
    </AuthProvider>
  );
}
