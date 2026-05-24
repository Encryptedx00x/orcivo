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
      backgroundColor: '#0A0A0F',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '40px 48px',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle grid texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,1) 39px, rgba(255,255,255,1) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,1) 39px, rgba(255,255,255,1) 40px)',
        pointerEvents: 'none',
      }} />

      {/* Logo mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #6D28D9 100%)',
          border: '1px solid rgba(109,40,217,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 7v5c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V7l-8-5z" fill="rgba(109,40,217,0.8)" stroke="#8B5CF6" strokeWidth="1.5"/>
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#FFFFFF', letterSpacing: '-0.01em' }}>Orcivo</span>
      </div>

      {/* Main content */}
      <div style={{ position: 'relative' }}>
        <h2 style={{
          fontSize: 32, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em',
          color: '#FFFFFF', margin: '0 0 16px',
        }}>
          {headline}
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0, maxWidth: 340 }}>
          {sub}
        </p>
      </div>

      {/* Testimonial */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: '20px 24px', position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            backgroundColor: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#FFFFFF', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#FFFFFF' }}>{testimonialWho}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{testimonialRole}</div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
          "{testimonialQuote}"
        </p>
      </div>
    </div>
  );
}
