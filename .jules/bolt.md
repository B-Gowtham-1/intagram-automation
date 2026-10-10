## 2024-10-10 - [React Memoization Stability]
**Learning:** [When applying React.memo to deeply nested grid structures, all passed callbacks (like handleDragStart, handleDragOver) must be wrapped in useCallback. Also, state updating functions should utilize functional state updates to avoid unnecessary dependencies and prevent child components from re-rendering un-neededly.]
**Action:** [Always ensure that all parent handlers passed as props to memoized components have stable references using useCallback. Pay special attention to functional state updates to reduce dependency arrays.]
