import { useState, useEffect } from 'react';

export function useIsTauri() {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(
      typeof window !== 'undefined' && 
      ('__TAURI_INTERNALS__' in window || 'isTauri' in window)
    );
  }, []);

  return isTauri;
} 