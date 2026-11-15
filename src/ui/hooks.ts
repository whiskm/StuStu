import { useCallback, useEffect, useState } from 'preact/hooks';

/** Возвращает функцию, которая перерисовывает компонент. */
export function useForce(): () => void {
  const [, set] = useState(0);
  return useCallback(() => set(x => x + 1), []);
}

/** Текущее время, обновляется раз в ms миллисекунд. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}
