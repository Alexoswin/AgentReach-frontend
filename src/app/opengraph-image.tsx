import { ImageResponse } from 'next/og';

// Default link-preview card for every page (LinkedIn, X, Slack, WhatsApp).
// Colors are the default "sky" accent; the logomark mirrors BrandMark in components/fx.tsx.
export const alt = 'ReachConvert — AI cold calling agents and personalized bulk email';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: 'radial-gradient(circle at 85% 15%, #0b3a52 0%, #060b0d 55%)',
          color: '#f4f7f8',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 27,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(140deg, #0cb4ee, #219ef2)',
            }}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#041019" strokeWidth="2.1" strokeLinecap="round">
              <circle cx="7.5" cy="16.5" r="2.1" fill="#041019" stroke="none" />
              <path d="M11.5 12.5a5.7 5.7 0 0 1 1.7 4" />
              <path d="M14.4 9.6a9.8 9.8 0 0 1 2.9 6.9" />
              <path d="M17.3 6.7a13.9 13.9 0 0 1 4.1 9.8" />
            </svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>ReachConvert</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            AI cold calling + personalized email, in one workspace
          </div>
          <div style={{ fontSize: 30, color: '#9fb0b8' }}>
            Open source · Signal-triggered campaigns · Real-time analytics
          </div>
        </div>
      </div>
    ),
    size,
  );
}
