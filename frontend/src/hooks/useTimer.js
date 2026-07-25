import { useState, useEffect, useRef } from 'react';

/**
 * Use requestAnimationFrame so that the display stays perfectly in sync with the browser paint cycle, 
 * without the drift that setInterval accumulates.
 */
export function useTimer({ session, isPaused, pausedAt }) {
  const rafRef = useRef(null);

  function compute() {
    if (!session) return 0;
    const allocatedMs    = session.numberOfParts * session.timePerPart * 60_000;
    const currentPauseMs = isPaused && pausedAt ? Date.now() - pausedAt : 0;
    const elapsed        = Date.now() - session.startTime - session.totalPausedMs - currentPauseMs;
    return allocatedMs - elapsed;
  }

  const [timeLeftMs, setTimeLeftMs] = useState(compute);

  useEffect(() => {
    if (isPaused) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let lastSec = null;

    function tick() {
      const ms  = compute();
      const sec = Math.floor(ms / 1000);

      // Only trigger a re-render when the second changes (not every frame)
      if (sec !== lastSec) {
        lastSec = sec;
        setTimeLeftMs(ms);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, session?.startTime, session?.totalPausedMs, pausedAt]);

  return timeLeftMs;
}

/** ms → hh:mm:ss  (negative sign if overtime) */
export function formatMs(ms) {
  const neg = ms < 0;
  const abs = Math.abs(Math.trunc(ms / 1000));
  const h   = String(Math.floor(abs / 3600)).padStart(2, '0');
  const m   = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  const s   = String(abs % 60).padStart(2, '0');
  return `${neg ? '−' : ''}${h}:${m}:${s}`;
}
