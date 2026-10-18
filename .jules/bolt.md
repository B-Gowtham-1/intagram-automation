## 2026-10-18 - React.memo and useCallback optimization
**Learning:** For React.memo to be effective on a child component, all functions passed down as props from the parent components must maintain stable references using useCallback. Functional updater pattern in setState allows useCallback to maintain an empty dependency array.
**Action:** Always wrap the callbacks passed down to memoized children in useCallback, and verify all props are stable across renders.
