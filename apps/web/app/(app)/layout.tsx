import { AppSidebar } from '../../components/AppSidebar';
import { TopBar } from '../../components/TopBar';

export default function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AppSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <main style={{ flex: 1, padding: 24, backgroundColor: '#F9FAFB' }}>{children}</main>
      </div>
    </div>
  );
}
