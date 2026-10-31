## 2024-11-20 - React Hook Ordering and Refs in Callbacks

**Learning:** When moving state to `useRef` to optimize React rendering performance during drag-and-drop operations, and subsequently wrapping the event handlers in `React.useCallback`, it's critical to place the hook declarations *before* any early return statements (like `if (images.length === 0) return null;`). Failing to do so breaks the Rules of Hooks. Also, `URL.revokeObjectURL` should not be executed inside a React state updater function since state updaters must be pure.

**Action:** Always verify the placement of hook declarations when refactoring components to add optimizations, ensuring they are at the top level and run unconditionally. Always extract side-effects from state updaters to `useCallback` or `useEffect`.

## 2024-11-20 - React Sibling Component Rendering Bottlenecks

**Learning:** In complex React forms (like `Home.tsx` handling images, accounts, and captions), state updates in one section (e.g., typing in the `CaptionEditor`) will cause all sibling components (e.g., `AccountSelector`, `CarouselPreview`, `ImageGrid`) to re-render if they are not memoized. This can lead to input lag and layout thrashing, especially when components like `CarouselPreview` render lists of images.

**Action:** When a parent component manages state for multiple complex and independent children, wrap the presentational children in `React.memo()` to ensure they only re-render when their specific props change, preventing global re-renders on every keystroke.
