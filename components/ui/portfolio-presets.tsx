'use client';

export type PresetName = 'equal' | 'minvar' | 'custom';

interface PortfolioPresetsProps {
  active: PresetName;
  onSelect: (preset: PresetName) => void;
  /** Disable min-var if covariance is not loaded */
  disableMinVar?: boolean;
}

const PRESETS: Array<{ name: PresetName; prefix: string; description: string }> = [
  {
    name: 'equal',
    prefix: '[EQUAL]',
    description: 'Equal weight across all selected assets',
  },
  {
    name: 'minvar',
    prefix: '[MIN-VAR]',
    description: 'Minimum variance portfolio (analytic, long-only)',
  },
  {
    name: 'custom',
    prefix: '[CUSTOM]',
    description: 'Drag handles to set weights manually',
  },
];

/**
 * Text-link preset switcher.
 * Active = underlined accent color. Inactive = tertiary, no decoration.
 * Mono prefix [LABEL] before the display name.
 */
export function PortfolioPresets({ active, onSelect, disableMinVar = false }: PortfolioPresetsProps) {
  return (
    <div className="flex items-center gap-5">
      {PRESETS.map(({ name, prefix, description }) => {
        const isActive = active === name;
        const isDisabled = name === 'minvar' && disableMinVar;

        return (
          <button
            key={name}
            title={description}
            disabled={isDisabled}
            onClick={() => { if (!isDisabled) onSelect(name); }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-small)',
              letterSpacing: '0.05em',
              color: isDisabled
                ? 'var(--text-quaternary)'
                : isActive
                ? 'var(--accent)'
                : 'var(--text-tertiary)',
              textDecoration: isActive ? 'underline' : 'none',
              textUnderlineOffset: '3px',
              transition: 'color 0.15s ease',
            }}
          >
            <span style={{ color: 'var(--text-quaternary)' }}>{prefix.slice(0, 1)}</span>
            <span>{prefix.slice(1, -1)}</span>
            <span style={{ color: 'var(--text-quaternary)' }}>{prefix.slice(-1)}</span>
          </button>
        );
      })}
    </div>
  );
}
