# StudyMate AI upgrade: deployment and account storage

## Included
- Homepage and dashboard navigation, including a clear **Homepage** button.
- **Start Learning** and **Get Started** open registration; **Log in** opens login; **Explore as Guest** enters the dashboard without registration.
- Full Course / Deep Notes generates chapter-based teaching, worked examples, practice, cheat sheet, and final review.
- Email/password account registration, login, logout, and saved course/lesson history APIs.
- Existing lesson, exam, quiz, PDF print, PWA, and other dashboard UI retained.

## Deploy on Render
1. Extract the ZIP, then copy its **contents** into the root of your existing `studymate_ai` GitHub Desktop repository. **Do not replace or delete `.git`**.
2. Commit and push to `main` using GitHub Desktop. Render will auto-deploy if enabled.
3. Keep the Render environment variable `GEMINI_API_KEY` set privately.
4. For **persistent accounts and history across deploys and devices**, configure a managed PostgreSQL database and set `DATABASE_URL` in the Render web service environment. The app creates its own tables at startup. Use a secure, private PostgreSQL URL; do not commit it to GitHub. Without `DATABASE_URL`, it uses local SQLite, which **is not durable on Render's free ephemeral filesystem**. Users and history may disappear when the service restarts or redeploys.
5. Verify the homepage, guest access, signup, login, logout, Full Course generation, history, and Exam Simulator after deployment.

## Security and operational notes
- Passwords are salted and hashed with PBKDF2; sessions use HttpOnly, Secure, SameSite=Lax cookies.
- Production must use HTTPS. Never publish Gemini keys or database passwords.
- This starter auth system has no password reset, email verification, bot protection, rate limits, or admin tools. Add those before promoting it to a large public audience.
- The AI course uses one generation request and may be long or occasionally incomplete due to model output limits. Retry if it fails. Verify important AI-generated content.
- Public AI endpoints can consume your Gemini quota. Add usage limits before broad public release.
