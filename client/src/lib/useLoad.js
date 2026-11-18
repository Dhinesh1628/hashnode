import { useCallback, useEffect, useState } from 'react';

// Loads data whenever `deps` change. Returns { data, error, loading, reload, setData }.
//
// - deps must be simple values (strings, numbers, booleans).
// - When deps change, old data is dropped, so one post never flashes on another's page.
// - reload() fetches again but keeps showing the current data meanwhile.
// - setData() lets a page update what's shown (e.g. a new like count) without refetching.
// - Answers that arrive after the page moved on are ignored.
export function useLoad(load, deps) {
  const key = JSON.stringify(deps);
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState({ key: null, fetchKey: null, data: null, error: null });
  const fetchKey = `${key}#${reloads}`;

  useEffect(() => {
    let current = true;
    load().then(
      (data) => current && setResult({ key, fetchKey, data, error: null }),
      (error) => current && setResult({ key, fetchKey, data: null, error }),
    );
    return () => { current = false; };
    // `load` is a new function on every render; `fetchKey` captures what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  const sameDeps = result.key === key;
  const reload = useCallback(() => setReloads((n) => n + 1), []);
  const setData = useCallback(
    (update) => setResult((r) => ({ ...r, data: typeof update === 'function' ? update(r.data) : update })),
    [],
  );

  return {
    data: sameDeps ? result.data : null,
    error: sameDeps && result.fetchKey === fetchKey ? result.error : null,
    loading: result.fetchKey !== fetchKey,
    reload,
    setData,
  };
}
