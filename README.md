# StudyMate AI: Search Any Topic

This version includes four built-in sample lessons **plus real AI lesson generation** for arbitrary topics when the backend is configured.

## Start on Mac

1. Install Python 3.10+ if needed.
2. Open Terminal, go into the extracted folder: `cd ~/Downloads/studymate-ai` (adjust path if needed).
3. Create an environment: `python3 -m venv .venv`
4. Activate it: `source .venv/bin/activate`
5. Install packages: `pip install -r requirements.txt`
6. Get an OpenAI API key from https://platform.openai.com/api-keys. API usage is billed separately from ChatGPT subscriptions.
7. In Terminal set the key (do not share it): `export OPENAI_API_KEY='YOUR_KEY_HERE'`
8. Start: `uvicorn server:app --reload`
9. Visit **http://127.0.0.1:8000** in your browser. **Do not double-click index.html** for AI search.

Search a topic not among the built-in lessons, such as "Photosynthesis" or "Eigenvalues". Select a level first.

## Current limitations

- AI-generated explanations, examples and quizzes work with a valid API key, internet access and API credits.
- Only three preset illustration types are implemented (normal curve, derivative, Python loop). Other topics show a placeholder in the Visual tab until a proper diagram engine is added.
- Video tab links to **YouTube search results**, not verified recommended videos.
- The four sample lessons remain built in. Generated lessons are cached in memory for this page session only; saved lesson keys persist in localStorage but generated content does not survive a reload. A database is the next step.
- AI can make errors. Verify important facts and calculations.
- Do not expose your API key in GitHub or browser code. If deploying publicly, add authentication, rate limiting, quotas and abuse prevention before accepting public requests.

## Next features

Add reliable web source retrieval with citations, verified YouTube video recommendations, dynamic Plotly/Desmos visualizations, PDF uploads, accounts and persistent saved lessons.


## Note layout upgrade
The Notes tab now has **Simple explanation** and **Detailed notes** views. Generated lessons include headings, highlighted key terms, formula boxes where appropriate, key takeaways, and worked examples. The four offline samples also demonstrate the layout. Detailed sections for arbitrary topics require the AI backend.

## Updated dashboard and Exam Simulator
The new purple dashboard includes sidebar navigation, lesson tools, language selection, browser read-aloud, print-to-PDF, and an AI-powered full exam generator. Open **Exam Simulator**, choose topic, difficulty and question count, then generate an exam. Enter answers and click **Submit exam and reveal worked solutions**. The app does not yet grade free-text answers, enforce the timer, verify all generated math, or store exam history.

For AI search and exams you must run the FastAPI server and configure an API key as above. Language selection is sent to the lesson and exam generation endpoints. Built-in offline lessons remain in English. Voice uses browser speech synthesis and depends on installed language voices.
