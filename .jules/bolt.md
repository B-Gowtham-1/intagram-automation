## 2024-12-07 - [React Render Optimization in ImageGrid]
**Learning:** Without `React.memo` and `useCallback`, the entire image grid and all individual image cards re-render on any state change in `Home.tsx` (like typing a caption or uploading a new image). Furthermore, using `useState` for tracking drag indices that don't affect visuals causes unnecessary cascading re-renders.
**Action:** Use `React.memo` for list components and their items, wrap parent handlers in `useCallback`, and use `useRef` for UI state that doesn't need to trigger a render.
