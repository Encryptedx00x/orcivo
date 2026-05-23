export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
      {children}
    </div>
  );
}
