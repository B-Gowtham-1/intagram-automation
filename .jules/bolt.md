## 2024-05-18 - [React.memo and Callbacks]
**Learning:** Using a custom comparison function for React.memo that ignores callback props causes stale closures and breaks component interactivity (e.g. edit/delete using old state).
**Action:** Always memoize callback handlers in the parent component using useCallback rather than trying to bypass function comparison in React.memo's areEqual argument.
