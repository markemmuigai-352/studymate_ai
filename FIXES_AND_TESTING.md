# StudyMate AI stability correction

Fixes included:
- Removed stray Python route displayed below the website.
- Added the missing backend route for smart-pdf-help.js.
- Disabled browser autofill on the learning and full-course topic fields. Existing saved autofill entries may still require manual removal in Chrome.
- Changed the default Gemini model to `gemini-2.5-flash-lite`, overridable using the `GEMINI_MODEL` Render environment variable. Check that this model is available to your API key.
- Added retries with backoff for transient 429/5xx Gemini errors and clearer failure messages.
- Added a client-side timeout for AI generation requests so the UI does not wait indefinitely.
- Passed the selected language through AI generation requests and automatically refreshed a currently selected lesson when language changes.
- Updated frontend cache revision.

## Deploy
Copy the contents of this directory into the existing GitHub repository (do not overwrite `.git`), commit and push. Render should redeploy.

## Smoke tests
1. Open the site with a hard refresh. Verify no Python code is visible at the bottom.
2. Open My Learning. The Full Course field should be blank, not autofilled with the support email.
3. Change the language to Portuguese and generate a short lesson. Verify the explanation is in Portuguese.
4. Generate an exam. Verify the loading state eventually completes or shows a meaningful error.
5. Check Render logs for upstream errors if Gemini is still unavailable. A 503 can be an external service issue.
6. Verify Help & Suggestions opens an email draft addressed to the support email.

**Note:** The current PDF extraction still uses representative excerpts for long PDFs. This patch does not implement complete chapter-by-chapter PDF indexing or guarantee that Gemini service capacity is available.
