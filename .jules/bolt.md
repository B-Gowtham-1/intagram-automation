## 2024-10-07 - [Optimizing image upload]
**Learning:** Sequential file processing blocks the main thread during image upload, severely affecting performance when multiple files are uploaded.
**Action:** Replaced sequential loop with Promise.all in frontend/src/components/ImageUploader.tsx to process files in parallel.
