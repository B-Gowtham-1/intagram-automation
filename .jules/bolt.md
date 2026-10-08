## 2024-10-08 - Concurrent File Processing in React
**Learning:** React state updates using async operations in loops can create significant blocking time on the UI thread when processing multiple files. `Promise.all` can process these files concurrently, significantly reducing total wait time for the user.
**Action:** When handling multiple file uploads in `ImageUploader` components, use `Promise.all` with `Array.map` rather than sequential `for` loops for `async` operations like `processSelectedFile`.
