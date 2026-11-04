## 2024-11-20 - React Hook Ordering and Refs in Callbacks

**Learning:** When moving state to `useRef` to optimize React rendering performance during drag-and-drop operations, and subsequently wrapping the event handlers in `React.useCallback`, it's critical to place the hook declarations *before* any early return statements (like `if (images.length === 0) return null;`). Failing to do so breaks the Rules of Hooks. Also, `URL.revokeObjectURL` should not be executed inside a React state updater function since state updaters must be pure.

**Action:** Always verify the placement of hook declarations when refactoring components to add optimizations, ensuring they are at the top level and run unconditionally. Always extract side-effects from state updaters to `useCallback` or `useEffect`.

## 2026-11-04 - Stabilize Home.tsx Callbacks to enable ImageGrid Memoization
**Learning:** Wrapping a component (like `ImageGrid`) in `React.memo()` won't improve performance if its parent component (`Home.tsx`) passes down inline arrow functions or unstable function references for event handlers. The parent component's re-renders (triggered by typing in unrelated inputs like `CaptionEditor`) re-create these handler functions on every keystroke, forcing the memoized child component to re-render anyway.
**Action:** Always verify that handler functions passed down to a memoized component are wrapped in `React.useCallback`. When wrapping handlers in `React.useCallback`, utilize the functional form of state setters (`setState(prev => ...)`) to remove state dependencies from the `useCallback` dependency array, ensuring the callback reference stays completely stable across all renders.
