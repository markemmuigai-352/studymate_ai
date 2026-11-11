# StudyMate AI: PDF + focused dashboard update

Based on the Coordinated Upgrade. Copy all contents into your existing GitHub repository, commit, push, and let Render deploy. Do not replace `.git`.

## New behavior
- Home shows progress and quick navigation.
- My Learning shows topic entry, simple lesson, detailed course, and optional PDF upload.
- Practice Exams shows full exam setup and optional PDF upload, keeping custom timers, grading, and weak-area tracking.
- Study Planner has its own view.
- PDFs are parsed in memory with PyMuPDF and attached as reference text to AI requests. No PDF file is stored on the server.

## Limits and caveats
- Text PDFs only, max 8 MB, 80 pages. Scanned PDFs are not OCR'd.
- Up to 30,000 characters are extracted and up to 24,000 sent to the AI. This can omit parts of long papers.
- Generated questions are based on extracted PDF text; exact reproduction of original PDF questions is not guaranteed.
- This update does not add persistent storage for progress.
- Test on Render with your Gemini key; AI accuracy and deployment cannot be guaranteed by syntax checks.
