import { AppSidebar } from '../../components/AppSidebar';
import { TopBar } from '../../components/TopBar';
import { SubscriptionBanner } from '../../components/SubscriptionBanner';

export default function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <AppSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <SubscriptionBanner />
        <TopBar />
        <main className="ov-page" style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
