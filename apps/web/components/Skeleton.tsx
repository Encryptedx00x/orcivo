export function SkeletonListPage(): React.JSX.Element {
  return (
    <div>
      <div className="ov-page-header">
        <div>
          <div className="ov-skel" style={{ width: 180, height: 28, marginBottom: 8 }} />
          <div className="ov-skel" style={{ width: 120, height: 16 }} />
        </div>
        <div className="ov-skel" style={{ width: 140, height: 40, borderRadius: 10 }} />
      </div>
      <div className="ov-card" style={{ padding: 0, overflow: 'hidden' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 18px',
              borderBottom: i < 5 ? '1px solid var(--border-2)' : 0,
            }}
          >
            <div
              className="ov-skel"
              style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div className="ov-skel" style={{ width: '40%', height: 14, marginBottom: 6 }} />
              <div className="ov-skel" style={{ width: '25%', height: 12 }} />
            </div>
            <div className="ov-skel" style={{ width: 80, height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDetailPage(): React.JSX.Element {
  return (
    <div>
      <div className="ov-page-header">
        <div>
          <div className="ov-skel" style={{ width: 220, height: 28, marginBottom: 8 }} />
          <div className="ov-skel" style={{ width: 140, height: 16 }} />
        </div>
        <div className="ov-skel" style={{ width: 100, height: 40, borderRadius: 10 }} />
      </div>
      <div className="ov-card ov-card-body" style={{ marginBottom: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ marginBottom: i < 3 ? 14 : 0 }}>
            <div className="ov-skel" style={{ width: '20%', height: 11, marginBottom: 6 }} />
            <div className="ov-skel" style={{ width: '55%', height: 15 }} />
          </div>
        ))}
      </div>
      <div className="ov-card ov-card-body">
        <div className="ov-skel" style={{ width: '100%', height: 120 }} />
      </div>
    </div>
  );
}
