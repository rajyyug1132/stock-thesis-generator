import { CSSProperties, ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function SectionLabel({ children, className = '', style }: SectionLabelProps) {
  return (
    <div className={`section-label ${className}`} style={style}>
      {children}
    </div>
  );
}
