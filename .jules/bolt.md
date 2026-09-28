## 2024-05-18 - [Optimize File Upload Processing]
**Learning:** Sequential processing of uploaded files in `frontend/src/components/ImageUploader.tsx` causes a bottleneck as each file waits for the previous one to finish processing (reading, extracting frames, etc.).
**Action:** Always process independent async operations concurrently using `Promise.all()` to improve performance.
