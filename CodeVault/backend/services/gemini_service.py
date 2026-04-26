"""
Gemini AI Service — Code analysis and multi-approach extraction.
Implements the Deep-Scan Engine from the blueprint.
"""

import json
import re
import os
from typing import Optional

GEMINI_AVAILABLE = False
genai_client = None

try:
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key:
        genai_client = genai.Client(api_key=api_key)
        GEMINI_AVAILABLE = True
except ImportError:
    pass


SYSTEM_PROMPT = """You are an expert DSA code analyzer. Given a code file, you must:

1. Identify the problem being solved from the code logic.
2. Scan for multiple solutions — look for commented-out blocks that represent alternative approaches (e.g., brute force, memoization, tabulation).
3. For each approach found, uncomment the code and make it executable.
4. Infer difficulty, DSA tags, time/space complexity, and generate test cases.

Return ONLY valid JSON in this exact format:
{
  "title": "Problem Title",
  "problem_statement": "Markdown description of the problem",
  "difficulty": "Easy|Medium|Hard|Impossible",
  "dsa_tags": ["Tag1", "Tag2"],
  "extracted_approaches": [
    {
      "approach_name": "Approach Name",
      "raw_code": "executable code here",
      "time_complexity": "O(...)",
      "space_complexity": "O(...)",
      "explanation": "Brief explanation"
    }
  ],
  "generated_test_cases": [
    {"input": "...", "expected_output": "..."}
  ]
}"""


async def analyze_code_file(content: str, filename: str, language: str) -> dict:
    """Analyze a code file using Gemini API.
    Falls back to heuristic analysis if Gemini is unavailable."""

    if GEMINI_AVAILABLE and genai_client:
        return await _gemini_analyze(content, filename, language)
    return _heuristic_analyze(content, filename, language)


async def _gemini_analyze(content: str, filename: str, language: str) -> dict:
    """Use Gemini to analyze the code file."""
    try:
        response = genai_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"Analyze this {language} code file named '{filename}':\n\n```{language}\n{content}\n```",
            config={
                "system_instruction": SYSTEM_PROMPT,
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini analysis failed for {filename}: {e}")
        return _heuristic_analyze(content, filename, language)


def _heuristic_analyze(content: str, filename: str, language: str) -> dict:
    """Fallback heuristic analysis when Gemini is unavailable."""
    # Extract title from filename
    title = os.path.splitext(filename)[0]
    title = re.sub(r'[_\-]', ' ', title).strip().title()

    # Detect DSA tags from common patterns
    tags = []
    patterns = {
        'DP': [r'dp\[', r'memo\[', r'tabulation', r'memoiz'],
        'Array': [r'arr\[', r'nums\[', r'vector<'],
        'String': [r'string\s', r'str\[', r'substr'],
        'Tree': [r'TreeNode', r'root\->', r'left.*right'],
        'Graph': [r'adj\[', r'graph\[', r'BFS|DFS', r'visited'],
        'Stack': [r'stack<', r'\.push\(', r'\.pop\('],
        'Queue': [r'queue<', r'deque'],
        'Binary Search': [r'binary.?search', r'low.*high.*mid', r'left.*right.*mid'],
        'Greedy': [r'greedy', r'sort\('],
        'Recursion': [r'return\s+\w+\(', r'recursive'],
        'Linked List': [r'ListNode', r'next\s*=', r'head\->'],
        'Hash Map': [r'unordered_map', r'HashMap', r'dict\(', r'\{\}'],
    }

    content_lower = content.lower()
    for tag, pats in patterns.items():
        for pat in pats:
            if re.search(pat, content, re.IGNORECASE):
                tags.append(tag)
                break

    if not tags:
        tags = ['General']

    # Detect difficulty from code length/complexity
    lines = len(content.strip().split('\n'))
    difficulty = 'Easy' if lines < 30 else 'Medium' if lines < 80 else 'Hard'

    # Try to split commented approaches
    approaches = _extract_approaches(content, language)

    return {
        'title': title,
        'problem_statement': f'Solution for: {title}',
        'difficulty': difficulty,
        'dsa_tags': tags[:5],
        'extracted_approaches': approaches,
        'generated_test_cases': [],
    }


def _extract_approaches(content: str, language: str) -> list:
    """Extract multiple approaches from commented blocks in a file."""
    approaches = []

    if language in ('cpp', 'java'):
        # Look for // Approach: or /* Approach patterns
        blocks = re.split(r'(?:^|\n)\s*(?://|/\*)\s*(?:Approach|Method|Solution)\s*\d*\s*[:\-]?\s*', content, flags=re.IGNORECASE)
    elif language == 'python':
        blocks = re.split(r'(?:^|\n)\s*#\s*(?:Approach|Method|Solution)\s*\d*\s*[:\-]?\s*', content, flags=re.IGNORECASE)
    else:
        blocks = [content]

    if len(blocks) <= 1:
        # No explicit approach markers — treat the whole file as one approach
        approaches.append({
            'approach_name': 'Original Solution',
            'raw_code': content.strip(),
            'time_complexity': '',
            'space_complexity': '',
            'explanation': 'Complete solution as uploaded',
        })
    else:
        for i, block in enumerate(blocks):
            block = block.strip()
            if not block or len(block) < 10:
                continue
            # Try to extract the approach name from the first line
            first_line = block.split('\n')[0].strip()
            name = first_line if len(first_line) < 60 else f'Approach {i}'

            approaches.append({
                'approach_name': name,
                'raw_code': block,
                'time_complexity': '',
                'space_complexity': '',
                'explanation': '',
            })

    return approaches
