interface Props {
  headline: string;
  sub: string;
  testimonialQuote: string;
  testimonialWho: string;
  testimonialRole: string;
}

export function AuthArtPanel({ headline, sub, testimonialQuote, testimonialWho, testimonialRole }: Props): JSX.Element {
  const initials = testimonialWho.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <div style={{
      background: 'linear-gradient(155deg, #4C1D95 0%, #6D28D9 45%, #0A0A0F 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: 48,
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    }}>
      {/* Grid texture com mask radial */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.18,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 30%, transparent 75%)',
        maskImage: 'radial-gradient(circle at 50% 50%, #000 30%, transparent 75%)',
        pointerEvents: 'none',
      }} />

      {/* Radial glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(167,139,250,0.32) 0%, transparent 50%)',
      }} />

      {/* Logo mark */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 7v5c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V7l-8-5z" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"/>
          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Words + depoimento — margin-top: auto empurra para baixo */}
      <div style={{ marginTop: 'auto', position: 'relative', zIndex: 1 }}>
        <h2 style={{
          fontSize: 38, lineHeight: '46px', fontWeight: 700,
          letterSpacing: '-0.02em', maxWidth: 380,
          margin: '0 0 12px', color: '#fff',
        }}>
          {headline}
        </h2>
        <p style={{
          fontSize: 16, lineHeight: '24px',
          color: 'rgba(255,255,255,0.78)',
          maxWidth: 360, margin: 0,
        }}>
          {sub}
        </p>

        {/* Depoimento */}
        <div style={{
          marginTop: 32, padding: 18, borderRadius: 14,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(6px)',
          maxWidth: 420,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 13, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{testimonialWho}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{testimonialRole}</div>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: '22px', color: 'rgba(255,255,255,0.92)', margin: 0 }}>
            "{testimonialQuote}"
          </p>
        </div>
      </div>
    </div>
  );
}
