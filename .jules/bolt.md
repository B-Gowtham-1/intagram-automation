## 2024-11-20 - React Hook Ordering and Refs in Callbacks

**Learning:** When moving state to `useRef` to optimize React rendering performance during drag-and-drop operations, and subsequently wrapping the event handlers in `React.useCallback`, it's critical to place the hook declarations *before* any early return statements (like `if (images.length === 0) return null;`). Failing to do so breaks the Rules of Hooks. Also, `URL.revokeObjectURL` should not be executed inside a React state updater function since state updaters must be pure.

**Action:** Always verify the placement of hook declarations when refactoring components to add optimizations, ensuring they are at the top level and run unconditionally. Always extract side-effects from state updaters to `useCallback` or `useEffect`.
## 2026-10-29 - [Stable function identities with useCallback]
**Learning:** Using React.memo on components like ImageCard isn't enough if the parent component (Home.tsx) recreates handler functions (like handleRemove, handleMove) on every render (e.g. during typing in a caption editor).
**Action:** Always wrap handler functions passed as props to memoized components with useCallback. Crucially, when handlers update state based on previous state (like lists), use the functional update form of setState (e.g., setImages(prev => ...)) to keep the dependency array empty and avoid stale closures without breaking the stability of the callback.
