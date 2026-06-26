'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { UpgradeModal } from '@/components/upgrade-modal';

interface UpgradeContextValue {
  /** Open the upgrade modal, optionally with a reason key (see UPGRADE_REASON_COPY). */
  showUpgrade: (reason?: string) => void;
}

// Default is a no-op so components never crash if rendered outside the provider.
const UpgradeContext = createContext<UpgradeContextValue>({ showUpgrade: () => {} });

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('default');

  const showUpgrade = useCallback((r = 'default') => {
    setReason(r);
    setOpen(true);
  }, []);

  return (
    <UpgradeContext.Provider value={{ showUpgrade }}>
      {children}
      <UpgradeModal open={open} reason={reason} onClose={() => setOpen(false)} />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade(): UpgradeContextValue {
  return useContext(UpgradeContext);
}
