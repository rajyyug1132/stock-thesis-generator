/* eslint-disable */
/* Header — nav + live Nifty ticker */

function Header({ go, current }) {
  const live = window.NIFTY_LIVE;
  const positive = live.change >= 0;
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 28, height: 56,
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 32px', background: 'var(--bg-canvas)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <button onClick={() => go('home')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <LogoMark size={24} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--text-primary)',
        }}>THESIS · ENGINE</span>
      </button>
      <nav style={{ marginLeft: 'auto', display: 'flex', gap: 28 }}>
        {[
          { id: 'home',    label: 'STOCKS'  },
          { id: 'compare', label: 'COMPARE' },
          { id: 'method',  label: 'METHOD'  },
        ].map((tab) => {
          const active = current === tab.id || (current === 'stock' && tab.id === 'home');
          return (
            <button key={tab.id} onClick={() => tab.id === 'method' ? null : go(tab.id)} style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: active ? 'var(--text-primary)' : '#d4d4d8',
              borderBottom: active ? '1px solid var(--accent)' : '1px solid transparent',
              paddingBottom: 4, cursor: 'pointer',
            }}>{tab.label}</button>
          );
        })}
      </nav>
      <div style={{
        borderLeft: '1px solid var(--border-subtle)',
        paddingLeft: 20, marginLeft: 8,
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        color: '#d4d4d8',
        display: 'inline-flex', alignItems: 'baseline', gap: 8,
      }}>
        <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>NIFTY</span>
        <span className="num" style={{ color: '#d4d4d8' }}>{live.level.toFixed(2)}</span>
        <span className="num" style={{ color: positive ? 'var(--up)' : 'var(--down)' }}>
          {positive ? '▲' : '▼'}{(live.change * 100).toFixed(2)}%
        </span>
      </div>
    </header>
  );
}

function MethodStrip() {
  const items = [
    { n: '01', label: 'LIVE DATA',         desc: 'Yahoo Finance prices, fundamentals, and news fetched at request time.' },
    { n: '02', label: 'GEMINI PRO THESIS', desc: 'Structured JSON output: summary, bull case, bear case, risks, catalysts.' },
    { n: '03', label: 'FLASH VALIDATION',  desc: 'Every evidence field checked against source. Grounded vs unverified — shown inline.' },
  ];
  return (
    <div style={{
      borderBottom: '1px solid var(--border-subtle)',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-elevated)',
    }}>
      <div className="column" style={{ padding: '24px 32px 24px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {items.map(({ n, label, desc }, i) => (
          <div key={n} style={{
            paddingRight: i < items.length - 1 ? 16 : 0,
            borderRight: i < items.length - 1 ? '1px solid #27272a' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="num" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em' }}>{n}</span>
              <SectionLabel>{label}</SectionLabel>
            </div>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: 'var(--text-small)', lineHeight: 1.55 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Header, MethodStrip });
