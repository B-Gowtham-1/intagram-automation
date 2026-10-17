## 2024-05-19 - React Component Memoization in ImageCard
**Learning:** Found a missing React.memo() on `ImageCard` within the `ImageGrid` in `frontend/src/components/ImageCard.tsx`. This causes unnecessary re-renders of the list item when parent state updates.
**Action:** Always verify memoization when working with lists and individual items.
