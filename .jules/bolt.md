## 2025-02-28 - [Concurrent File Processing]
**Learning:** Using `Promise.all` over sequential iteration for file processing can drastically cut wait times, especially for operations like reading file contents where I/O handles the primary delay.
**Action:** When evaluating multiple file operations or network requests, check if they can safely be resolved concurrently.
