import { useEffect, useRef, useState } from 'react';

interface SlowLoadOptions {
  slowThresholdMs?: number;
  verySlowThresholdMs?: number;
}

export function useSlowLoadDetector(
  isLoading: boolean,
  options: SlowLoadOptions = {}
) {
  const { slowThresholdMs = 3500, verySlowThresholdMs = 10000 } = options;

  const [isSlow, setIsSlow] = useState(false);
  const [isVerySlow, setIsVerySlow] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let slowTimer: NodeJS.Timeout | null = null;
    let verySlowTimer: NodeJS.Timeout | null = null;

    if (isLoading) {
      startTimeRef.current = Date.now();
      setIsSlow(false);
      setIsVerySlow(false);

      slowTimer = setTimeout(() => {
        setIsSlow(true);
      }, slowThresholdMs);

      verySlowTimer = setTimeout(() => {
        setIsVerySlow(true);
      }, verySlowThresholdMs);
    } else {
      setIsSlow(false);
      setIsVerySlow(false);
      startTimeRef.current = null;
    }

    return () => {
      if (slowTimer) clearTimeout(slowTimer);
      if (verySlowTimer) clearTimeout(verySlowTimer);
    };
  }, [isLoading, slowThresholdMs, verySlowThresholdMs]);

  return { isSlow, isVerySlow };
}
