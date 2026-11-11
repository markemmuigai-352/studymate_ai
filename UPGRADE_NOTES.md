# StudyMate AI coordinated upgrade (11 November 2026)

## Included
- Simplified homepage and sidebar navigation, removing redundant homepage buttons and hiding duplicate tool controls.
- Student progress overview based on saved lessons, practice exams and planner tasks.
- Practice exams with user-defined 1–600 minute duration or no timer, countdown, five-minute warning, automatic submission, and restoration after page refresh within the same browser session.
- AI-assisted partial-credit grading of written answers, individual worked solutions, mistake topics, exam tips, follow-up practice, and weak-area study planner suggestions.
- Guided full-course subtopic checkpoints: ask for an explanation, practise a subtopic, or continue.
- Student profile display name rather than public email; optional emoji avatar choices, photo upload, and password-confirmed account deletion.
- Fixes to JavaScript file serving routes and PWA cache version.

## Important limitations
- Exam marking is AI-assisted and can be wrong. It is not an official grade. Review worked solutions.
- Browser-local practice history and weak areas are saved on the current device. They are **not yet synced across devices** or backed up to the account database.
- The exam is restored after a refresh in the same browser session, but closing the tab or switching devices is not guaranteed to preserve an unfinished attempt.
- Full-course generation is subject to Gemini output length and availability. No AI calls were run during package verification.
- Persistent account and profile storage on Render requires DATABASE_URL pointing to a durable PostgreSQL database. Without it, SQLite data on ephemeral disk can be lost.
- Backend syntax and JavaScript syntax were checked. Full browser and API integration testing requires the deployed environment and configured GEMINI_API_KEY.

## Installation
1. Back up the existing repository.
2. Copy the **contents** of this folder into the existing GitHub Desktop repository folder. Do not copy the outer folder or delete `.git`.
3. Commit and Push origin.
4. Wait for Render to deploy and verify the live site. Test account login, exam generation, custom timer, marking, progress and profile.
