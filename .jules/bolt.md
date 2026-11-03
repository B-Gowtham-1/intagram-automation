## 2024-11-20 - React Hook Ordering and Refs in Callbacks

**Learning:** When moving state to `useRef` to optimize React rendering performance during drag-and-drop operations, and subsequently wrapping the event handlers in `React.useCallback`, it's critical to place the hook declarations *before* any early return statements (like `if (images.length === 0) return null;`). Failing to do so breaks the Rules of Hooks. Also, `URL.revokeObjectURL` should not be executed inside a React state updater function since state updaters must be pure.

**Action:** Always verify the placement of hook declarations when refactoring components to add optimizations, ensuring they are at the top level and run unconditionally. Always extract side-effects from state updaters to `useCallback` or `useEffect`.

## 2024-11-20 - React useCallback and Strict Equality Optimizations

**Learning:** When passing handlers down to memoized child components (`React.memo`), the `useCallback` empty dependency array works perfectly if you use the functional update form of `useState` (`setImages(prev => ...)`). Further performance is gained by ensuring object identity doesn't change unless modified (`item.orderIndex === idx ? item : {...}`). Running backend tests generates artifacts in `data/storage/` which should be carefully untracked before committing.

**Action:** Always use the functional update form of `useState` when wrapping handlers in `useCallback` without dependencies. Always untrack test artifacts after running tests.
