from pathlib import Path
import sys
p = Path(sys.argv[1]) if len(sys.argv)>1 else Path('server.py')
s = p.read_text(encoding='utf-8')
if 'SUBJECT_AWARE_TEACHING_RULES_V1' in s:
    print('Already patched'); sys.exit(0)
anchor = '@app.post("/api/lesson")'
if anchor not in s or "@app.post('/api/course')" not in s or 'EXAM DESIGN:' not in s:
    sys.exit('This server.py has a different structure. No changes made. Please provide the current server.py.')
rules = '''# SUBJECT_AWARE_TEACHING_RULES_V1
SUBJECT_AWARE_RULES = """
Adapt the teaching and assessment to the actual subject and the student's source material.
Do NOT force formulas, numerical calculations, equations, units, mathematical steps, or graphs into non-quantitative subjects.
Use formulas and fully worked calculations ONLY when relevant to the topic or the specific question.
For programming, use correct, readable, executable code and explain its behavior; do not invent math exercises.
For conceptual subjects, use clear explanations, definitions, comparisons, processes, timelines, examples, cases, and reasoning as appropriate.
For mathematics and statistics, render meaningful formulas, define symbols, and show accurate steps when needed.
If a JSON schema has a formulas array and the subject needs no formulas, return an empty array [].
If a JSON schema has a formula string and no formula is relevant, return an empty string.
An example may be conceptual, a case study, a walkthrough, a command sequence, or code; it need not contain calculations.
Do not introduce unrelated content just to fill a template. Respect the uploaded PDF's subject and level.
"""

'''
s = s.replace(anchor, rules + anchor, 1)
s = s.replace('Teach {req.topic} at {req.level} level in {req.language}.', 'Teach {req.topic} at {req.level} level in {req.language}.\n{SUBJECT_AWARE_RULES}', 1)
s = s.replace('example: string containing a fully worked example with numbered steps, calculations and an interpretation', 'example: string containing a clear, relevant worked example or practical walkthrough; calculations only when relevant', 1)
s = s.replace('Provide meaningful formulas and explain symbols.', 'Provide meaningful formulas and explain symbols only when the topic requires them; otherwise return formulas: [].', 1)
s = s.replace('Generate exactly {req.count} questions.', 'Generate exactly {req.count} questions.\n{SUBJECT_AWARE_RULES}', 1)
s = s.replace('- Explain every important calculation and transformation.', '- Explain every important calculation and transformation IF calculations are relevant; otherwise explain the conceptual reasoning, process, or code.', 1)
s = s.replace('- Show formulas before substituting numbers.', '- Show formulas before substituting numbers ONLY for questions that actually need formulas.', 1)
s = s.replace('- Show substitutions, calculations, and interpretations.', '- Show substitutions and calculations only when appropriate; for non-quantitative questions give detailed evidence-based reasoning or practical steps.', 1)
s = s.replace('- Use LaTeX notation for mathematical expressions.', '- Use LaTeX notation only for actual mathematical expressions; do not insert math into unrelated subjects.', 1)
s = s.replace('Create a COMPLETE, self-contained teaching course on {req.topic!r} at {req.level} level in {req.language}.', 'Create a COMPLETE, self-contained teaching course on {req.topic!r} at {req.level} level in {req.language}.\n{SUBJECT_AWARE_RULES}', 1)
s = s.replace('Explain every symbol in formulas. Include fully worked examples rather than just answers.', 'Explain symbols when formulas are relevant. Include thoroughly explained examples appropriate to the subject, not forced calculations.', 1)
p.write_text(s, encoding='utf-8')
print('Updated', p)
