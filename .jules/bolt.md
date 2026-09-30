## 2025-02-18 - [Concurrent File Processing]
**Learning:** The `ImageUploader` component was processing uploaded files sequentially using a `for...await` loop. This caused upload times to scale linearly `O(n)` with the number of files selected. Because image processing is often an async operation (like canvas transformations), sequential waiting was a pure bottleneck.
**Action:** Replace `for...await` loops over multiple independent file uploads with `Promise.all` to process them concurrently, reducing total time to roughly `O(1)`.
