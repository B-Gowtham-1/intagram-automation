## 2026-10-13 - [Sequential file processing bottleneck in frontend upload]
**Learning:** [The frontend `ImageUploader` component was sequentially iterating over a `FileList` and awaiting file processing for each file one by one. While safe, this creates a major latency bottleneck when users upload a large carousel of files or when videos/heavy HEIC conversions take longer processing time.]
**Action:** [Use `Promise.all` coupled with array mapping to concurrently process file iterations when safe to do so, changing an O(N) wait-time operation to roughly an O(1) concurrent load.]
