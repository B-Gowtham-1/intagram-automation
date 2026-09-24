## 2024-09-24 - Memoizing ImageGrid and ImageCard
**Learning:** The ImageGrid and ImageCard components were re-rendering unnecessarily on every keystroke in the CaptionEditor due to missing memoization and unstable handler references.
**Action:** Use React.memo() on components that receive stable props and use useCallback() on event handlers in the parent component to prevent unnecessary re-renders.
