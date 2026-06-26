import { SectionLabel } from '@/components/ui/section-label';
import { Panel } from '@/components/ui/panel';
import { getBaseUrl } from '@/lib/utils';
import type { Thesis } from '@/lib/ai/schemas';

interface SharedData {
  symbol: string;
  thesis: Thesis;
  createdAt: string;
  expiresAt: string;
  daysLeft: number;
}

async function fetchShared(token: string): Promise<SharedData | { error: string }> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/share/thesis/${token}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { error: data.error ?? `Failed to load shared thesis (HTTP ${res.status})` };
    }
    return data as SharedData;
  } catch {
    return { error: 'Failed to load shared thesis' };
  }
}

function ThesisSectionView({ thesis }: { thesis: Thesis }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Summary */}
      <Panel label="THESIS SUMMARY">
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
          {thesis.summary}
        </p>
      </Panel>

      {/* Bull & Bear */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Panel label={`BULL CASE · ${thesis.bullCase.headline}`}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {thesis.bullCase.points.map((pt, i) => (
              <li key={i}>
                <p style={{ margin: '0 0 2px', color: 'var(--text-primary)', fontWeight: 500, fontSize: 'var(--text-small)' }}>
                  {pt.claim}
                </p>
                <p style={{ margin: 0, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 10, lineHeight: 1.5 }}>
                  {pt.evidence}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel label={`BEAR CASE · ${thesis.bearCase.headline}`}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {thesis.bearCase.points.map((pt, i) => (
              <li key={i}>
                <p style={{ margin: '0 0 2px', color: 'var(--text-primary)', fontWeight: 500, fontSize: 'var(--text-small)' }}>
                  {pt.claim}
                </p>
                <p style={{ margin: 0, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 10, lineHeight: 1.5 }}>
                  {pt.evidence}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Risks */}
      {thesis.risks.length > 0 && (
        <Panel label="RISKS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {thesis.risks.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                  padding: '2px 6px', border: '1px solid',
                  borderColor: r.severity === 'high' ? 'var(--rust)' : r.severity === 'medium' ? 'var(--border-strong)' : 'var(--border-subtle)',
                  color: r.severity === 'high' ? 'var(--rust)' : 'var(--text-tertiary)',
                }}>
                  {r.severity.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small)' }}>{r.risk}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Catalysts */}
      {thesis.catalysts.length > 0 && (
        <Panel label="CATALYSTS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {thesis.catalysts.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px',
                  border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {c.timeframe}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small)' }}>{c.event}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await fetchShared(token);
  const error = 'error' in result ? result.error : null;
  const data = 'error' in result ? null : result;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      {/* Shared view banner */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)',
        padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em',
          color: 'var(--accent)', textTransform: 'uppercase',
        }}>
          SHARED VIEW · READ ONLY
        </span>
        {data && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>
            EXPIRES IN {data.daysLeft} DAY{data.daysLeft !== 1 ? 'S' : ''}
          </span>
        )}
      </div>

      <div className="column" style={{ padding: '48px 32px 80px', maxWidth: 900 }}>
        {error && (
          <Panel label="ERROR">
            <p style={{ color: 'var(--rust)', margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)' }}>
              {error}
            </p>
            <a href="/" style={{ display: 'inline-block', marginTop: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
              ← BACK TO HOME
            </a>
          </Panel>
        )}

        {data && !error && (
          <>
            <div style={{ marginBottom: 32 }}>
              <SectionLabel>SHARED THESIS · AI-GROUNDED ANALYSIS</SectionLabel>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontWeight: 400,
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                color: 'var(--text-primary)', lineHeight: 1.05, margin: '8px 0 0',
                letterSpacing: '-0.015em',
              }}>
                {data.symbol.replace('.NS', '').replace('.BO', '')}
                <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}> thesis.</span>
              </h1>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-quaternary)',
                letterSpacing: '0.1em', marginTop: 10,
              }}>
                SHARED ON {new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()} · NOT FINANCIAL ADVICE
              </p>
            </div>

            <ThesisSectionView thesis={data.thesis} />

            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
              <a
                href={`/stock/${data.symbol.replace('.NS', '')}`}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
                  color: 'var(--accent)', textDecoration: 'none',
                }}
              >
                VIEW LIVE THESIS FOR {data.symbol.replace('.NS', '')} →
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
