import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from google import genai
from google.genai import types, errors as genai_errors
from pydantic import BaseModel, Field

app = FastAPI(title="StudyMate AI")
ROOT = Path(__file__).parent
MODEL = "gemini-3.5-flash-lite"


class LessonRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=180)
    level: str = "Beginner"
    language: str = "English"


class ExamRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=180)
    level: str = "University"
    count: int = Field(default=10, ge=1, le=30)
    language: str = "English"


@app.get("/manifest.webmanifest")
def app_manifest():
    return FileResponse(ROOT / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js")
def service_worker():
    return FileResponse(ROOT / "sw.js", media_type="application/javascript", headers={"Cache-Control": "no-cache"})


@app.get("/icons/{filename}")
def app_icon(filename: str):
    if filename not in {"icon-192.png", "icon-512.png"}:
        raise HTTPException(404, "Icon not found")
    return FileResponse(ROOT / "icons" / filename, media_type="image/png")


@app.get("/")
def home():
    return FileResponse(ROOT / "index.html")


def generate_json(prompt):
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            503, "GEMINI_API_KEY is missing from the server environment."
        )

    try:
        client = genai.Client(
            http_options=types.HttpOptions(timeout=120000)
        )
        import time

        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.4,
                    ),
                )
                return json.loads(response.text)

            except genai_errors.APIError as e:
                if e.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise
                time.sleep(2 ** attempt)

    except genai_errors.APIError as e:
        raise HTTPException(
            502, f"Gemini API error ({e.code}). Please try again."
        )
    except (ValueError, TypeError):
        raise HTTPException(
            502, "Gemini returned an invalid response."
        )


@app.post("/api/lesson")
def generate_lesson(req: LessonRequest):
    if req.level not in {"Beginner", "Intermediate", "Advanced"}:
        raise HTTPException(400, "Invalid learning level")

    prompt = f"""
You are an excellent educational tutor.
Teach {req.topic} at {req.level} level in {req.language}.

Return ONLY a valid JSON object with:
title: string
summary: string of 2-4 simple sentences
detailed: array of 3-6 objects with heading and text strings
points: array of 4-7 key point strings
key_terms: array of 3-8 short strings
formulas: array of objects with label, expression, explanation
example: string containing a worked example with numbered steps
quiz: object with q, options, correct, why
visual: one of normal, derivative, python, none

The quiz must have exactly 4 options.
correct must be an integer from 0 to 3.

Use visual normal only for normal distributions.
Use derivative only for derivatives.
Use python only for Python loops.
Otherwise use none.

Explain accurately, clearly, and with useful examples.
Do not invent sources or links.
"""
    data = generate_json(prompt)

    try:
        quiz = data["quiz"]
        assert isinstance(data["points"], list)
        assert len(quiz["options"]) == 4
        assert 0 <= int(quiz["correct"]) <= 3
        data["visual"] = (
            data.get("visual")
            if data.get("visual") in {"normal", "derivative", "python"}
            else "none"
        )
        return data
    except (KeyError, TypeError, ValueError, AssertionError):
        raise HTTPException(502, "Incomplete lesson. Please try again.")



def allocate_exam_marks(count):
    """Distribute exactly 20 marks across the questions."""
    from decimal import Decimal

    total_units = 200
    base, remainder = divmod(total_units, count)

    marks = [
        Decimal(base + (1 if i < remainder else 0)) / Decimal(10)
        for i in range(count)
    ]

    return [float(mark) for mark in marks]


@app.post("/api/exam")
def generate_exam(req: ExamRequest):
    prompt = rf"""
You are an experienced university examination setter and examiner.

Create an original {req.level} practice examination about
{req.topic}, written in {req.language}.

Generate exactly {req.count} questions.

REQUIRED MARK ALLOCATION:
{allocate_exam_marks(req.count)}

Assign these marks to the questions in the exact order shown.
Question 1 receives the first value, Question 2 the second, etc.
Do not change these allocations.
The total examination is worth exactly 20 marks.

EXAM DESIGN:
- Use realistic questions appropriate to the difficulty.
- Vary question complexity.
- Allocate marks according to the amount of work required.
- The ENTIRE examination must be worth exactly 20 marks.
- Distribute the 20 marks across all questions.
- Use fractional marks when necessary, especially for exams with more than 20 questions.
- The sum of all questions[].marks must equal 20.
- Allocate marks according to difficulty and work required.
- University questions should be challenging, not basic recall.
- Advanced questions should combine multiple concepts.
- Very Hard questions should require deep reasoning and unfamiliar applications.
- Include realistic multipart problems when appropriate.
- For multipart questions, state marks for each part.
- The sum of all step marks must equal the question marks.
- Include units and necessary assumptions.

SOLUTIONS:
- Provide detailed, numbered solution steps.
- Begin each worked solution by explaining what the question is asking.
- Identify all given information and unknown quantities.
- Explain why the chosen method is appropriate.
- Explain every important calculation and transformation.
- Interpret the final result in the context of the question.
- End each solution with a concise learning summary.
- The learning summary must explain the key concept, exam technique, and common mistakes.
- Use clear, educational language suitable for independent study.

- Show formulas before substituting numbers.
- Show substitutions, calculations, and interpretations.
- Explain why each formula or method applies.
- Check numerical answers and rounding.
- Use LaTeX notation for mathematical expressions.
- In question text, enclose every complete inline mathematical expression in $...$.
- For standalone equations, use $$...$$.
- Never leave LaTeX commands such as \mu, \sigma, \frac, or \text outside math delimiters.
- Keep units inside mathematical expressions using \text{...}.
- Write multipart questions with each part (a), (b), (c) on a separate line.
- Use actual readable question text, not literal backslash-n characters.
- Put important final answers in \\boxed{{...}}.
- Provide a realistic marking scheme with partial credit.
- Do not award marks to a student automatically.

Return ONLY valid JSON with this structure:

{{
  "title": "Practice examination title",
  "questions": [
    {{
      "question": "Complete exam question with parts and marks",
      "marks": 10,
      "solution": "Readable complete worked solution",
      "steps": [
        {{
          "heading": "Step 1: Identify the information",
          "explanation": "Explain the reasoning",
          "equation": "X \\sim N(0,1)",
          "marks": 2
        }}
      ],
      "final_answer": "Final result with units",
      "learning_summary": {{
        "key_concept": "Explain the main concept and why it matters.",
        "exam_technique": "Explain how to approach similar exam questions.",
        "common_mistakes": "Identify common errors and how to avoid them."
      }}
    }}
  ]
}}

IMPORTANT:
- Every question must have at least two solution steps.
- The sum of steps[].marks must equal questions[].marks.
- Use plain LaTeX expressions without dollar signs in equation.
- Keep solutions mathematically correct.
- Do not present this as an official examination.
"""
    data = generate_json(prompt)

    try:
        questions = data["questions"]
        if len(questions) != req.count:
            raise ValueError("Wrong question count")
        from decimal import Decimal, InvalidOperation

        total_marks = Decimal("0")

        for q in questions:
            if not all(k in q for k in ("question", "marks", "solution")):
                raise ValueError("Incomplete question")

            try:
                question_marks = Decimal(str(q["marks"]))
            except (InvalidOperation, TypeError):
                raise ValueError("Invalid question marks")

            if not question_marks.is_finite() or question_marks <= 0:
                raise ValueError("Question marks must be positive")

            total_marks += question_marks

            steps = q.get("steps")
            if not isinstance(steps, list) or len(steps) < 2:
                raise ValueError("Missing worked solution steps")

            step_total = Decimal("0")
            for step in steps:
                step_total += Decimal(str(step["marks"]))

            if step_total != question_marks:
                raise ValueError("Solution step marks do not match")

        if total_marks != Decimal("20"):
            raise ValueError("Exam must total 20 marks")

        return data
    except (KeyError, TypeError, ValueError):
        raise HTTPException(502, "Incomplete exam. Please try again.")
