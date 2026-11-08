## 2024-11-20 - React Hook Ordering and Refs in Callbacks

**Learning:** When moving state to `useRef` to optimize React rendering performance during drag-and-drop operations, and subsequently wrapping the event handlers in `React.useCallback`, it's critical to place the hook declarations *before* any early return statements (like `if (images.length === 0) return null;`). Failing to do so breaks the Rules of Hooks. Also, `URL.revokeObjectURL` should not be executed inside a React state updater function since state updaters must be pure.

**Action:** Always verify the placement of hook declarations when refactoring components to add optimizations, ensuring they are at the top level and run unconditionally. Always extract side-effects from state updaters to `useCallback` or `useEffect`.

## 2026-11-08 - useCallback with Functional State Updates

**Learning:** When attempting to memoize a complex component (like `ImageGrid`) using `React.memo`, wrapping callback props with `useCallback` is ineffective if the callbacks depend on rapidly changing state (like `images`), as they will recreate frequently. Using functional state updates (e.g., `setImages(prev => ...)`) removes the need for state dependencies in `useCallback`, ensuring true function reference stability across renders caused by entirely unrelated state changes (like typing a caption).

**Action:** Whenever using `React.memo` on a child component, ensure all callback props use `useCallback` coupled with functional state updates to eliminate state dependencies and maximize the effect of memoization.
