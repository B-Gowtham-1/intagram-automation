## 2024-10-24 - [Frontend Image Processing Optimization]
**Learning:** Sequential processing of multiple client-side media files (especially during EXIF/video validation steps) blocked the UI unneccessarily. `Promise.all` ensures concurrent execution without impacting the existing logic since array map retains the exact order.
**Action:** Use concurrent data fetching/processing where file ordering and state mutations do not strictly depend on the previous iterations' outcomes.
