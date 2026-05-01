"""
AI Service — Code analysis and multi-approach extraction.
Supports Groq (primary), Gemini (fallback), and heuristic analysis.
Implements the Deep-Scan Engine from the CodeVault blueprint.
"""

import json
import re
import os
import traceback
from typing import Optional


# ─── Lazy-init clients (avoid import-time failures) ─────────────
_groq_client = None
_groq_checked = False

_gemini_client = None
_gemini_checked = False


def _get_groq_client():
    global _groq_client, _groq_checked
    if _groq_checked:
        return _groq_client
    _groq_checked = True
    try:
        from groq import AsyncGroq
        key = os.getenv("GROQ_API_KEY", "")
        if key and key.strip():
            _groq_client = AsyncGroq(api_key=key.strip())
            print(f"[AI] ✅ Groq client initialized (key: {key[:8]}...)")
        else:
            print("[AI] ⚠️  GROQ_API_KEY is empty or not set")
    except ImportError:
        print("[AI] ⚠️  groq package not installed — run: pip install groq")
    except Exception as e:
        print(f"[AI] ❌ Groq init error: {e}")
    return _groq_client


def _get_gemini_client():
    global _gemini_client, _gemini_checked
    if _gemini_checked:
        return _gemini_client
    _gemini_checked = True
    try:
        from google import genai
        key = os.getenv("GEMINI_API_KEY", "")
        if key and key.strip():
            _gemini_client = genai.Client(api_key=key.strip())
            print(f"[AI] ✅ Gemini client initialized (key: {key[:8]}...)")
        else:
            print("[AI] ⚠️  GEMINI_API_KEY is empty or not set")
    except ImportError:
        print("[AI] ⚠️  google-genai package not installed")
    except Exception as e:
        print(f"[AI] ❌ Gemini init error: {e}")
    return _gemini_client


# ─── System Prompt ──────────────────────────────────────────────
EXTRACTION_PROMPT = """You are an expert DSA code analyzer for CodeVault (reverse-LeetCode platform). Analyze the given code file and return ONLY valid JSON matching this schema:

{
  "title": "<actual algorithmic problem name, NOT filename>",
  "problem_statement": "<markdown: 2-3 paragraph description, input/output, constraints, 2-3 examples>",
  "difficulty": "Easy|Medium|Hard|Impossible",
  "dsa_tags": ["<from: Array,String,DP,Tree,Graph,Stack,Queue,Linked List,Binary Search,Hash Map,Heap,Greedy,Recursion,Backtracking,Sorting,Two Pointers,Sliding Window,Bit Manipulation,Math,Trie,Union Find,Design>"],
  "extracted_approaches": [
    {
      "approach_name": "<descriptive, e.g. 'Stack-Based O(n)'>",
      "raw_code": "<complete standalone executable code>",
      "time_complexity": "O(...)",
      "space_complexity": "O(...)",
      "explanation": "<3+ sentences on WHY this approach works>"
    }
  ],
  "generated_test_cases": [
    {"input": "<stdin>", "expected_output": "<stdout>", "explanation": "<what it tests>"}
  ],
  "deep_analysis": {
    "overall_summary": "<paragraph>",
    "approaches": [
      {
        "approach_name": "...",
        "summary": "<paragraph>",
        "time_complexity": "O(...)",
        "space_complexity": "O(...)",
        "line_breakdown": [{"line_number": 1, "code": "...", "explanation": "..."}]
      }
    ],
    "key_insights": ["..."],
    "common_mistakes": ["..."]
  }
}

Rules:
- Identify the EXACT problem from code logic (not filename).
- Scan for multiple approaches: commented-out alt code, multiple functions, "Approach N" / "Brute Force" / "Optimized" labels. Uncomment commented blocks to make executable.
- Generate 3-5 test cases (basic, edge, tricky). Inputs/outputs are stdin/stdout for the program as written.
- line_breakdown: cover 5-15 most important lines per approach.
- key_insights: 3-5 items. common_mistakes: 2-4 items.
- Each approach explanation MUST be 3+ sentences."""


# ─── Main Entry Point ──────────────────────────────────────────
async def analyze_code_file(content: str, filename: str, language: str) -> dict:
    """Analyze a code file using Groq (primary), Gemini (fallback), or heuristics."""

    # Try Groq first
    groq = _get_groq_client()
    if groq:
        try:
            print(f"[AI] 🔍 Analyzing '{filename}' with Groq LLaMA 3.3...")
            result = await _groq_analyze(groq, content, filename, language)
            print(f"[AI] ✅ Groq analysis complete — title: '{result.get('title', '?')}', "
                  f"approaches: {len(result.get('extracted_approaches', []))}")
            return result
        except Exception as e:
            print(f"[AI] ❌ Groq failed for '{filename}': {e}")
            traceback.print_exc()

    # Fallback to Gemini
    gemini = _get_gemini_client()
    if gemini:
        try:
            print(f"[AI] 🔍 Analyzing '{filename}' with Gemini...")
            result = await _gemini_analyze(gemini, content, filename, language)
            print(f"[AI] ✅ Gemini analysis complete — title: '{result.get('title', '?')}'")
            return result
        except Exception as e:
            print(f"[AI] ❌ Gemini failed for '{filename}': {e}")
            traceback.print_exc()

    # Heuristic fallback
    print(f"[AI] ⚠️  Using heuristic fallback for '{filename}' (no AI engine available)")
    return _heuristic_analyze(content, filename, language)


# ─── Groq Analysis ─────────────────────────────────────────────
async def _groq_analyze(client, content: str, filename: str, language: str) -> dict:
    """Use Groq API (LLaMA 3.3 70B) to analyze the code file."""
    user_msg = (
        f"Analyze this {language} code file. The filename is '{filename}' but DO NOT use "
        f"the filename as the problem title — identify the actual algorithmic problem from "
        f"the code logic.\n\n```{language}\n{content}\n```"
    )

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.1,
        max_tokens=6000,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    result = json.loads(raw)

    # Ensure required keys exist with defaults
    result.setdefault("title", "Untitled Problem")
    result.setdefault("problem_statement", "")
    result.setdefault("difficulty", "Medium")
    result.setdefault("dsa_tags", [])
    result.setdefault("extracted_approaches", [])
    result.setdefault("deep_analysis", None)
    result.setdefault("generated_test_cases", [])

    return result


# ─── Gemini Analysis ───────────────────────────────────────────
async def _gemini_analyze(client, content: str, filename: str, language: str) -> dict:
    """Use Gemini to analyze the code file."""
    user_msg = (
        f"Analyze this {language} code file. The filename is '{filename}' but DO NOT use "
        f"the filename as the problem title — identify the actual algorithmic problem.\n\n"
        f"```{language}\n{content}\n```"
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=user_msg,
        config={
            "system_instruction": EXTRACTION_PROMPT,
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    )
    result = json.loads(response.text)
    result.setdefault("title", "Untitled Problem")
    result.setdefault("problem_statement", "")
    result.setdefault("extracted_approaches", [])
    result.setdefault("deep_analysis", None)
    result.setdefault("generated_test_cases", [])
    result.setdefault("dsa_tags", [])
    return result


# ─── Heuristic Fallback ────────────────────────────────────────
def _heuristic_analyze(content: str, filename: str, language: str) -> dict:
    """Fallback heuristic analysis when no AI engine is available."""
    title = os.path.splitext(filename)[0]
    title = re.sub(r'^\d+[_\-\s]*', '', title)  # Strip leading numbers
    title = re.sub(r'[_\-]+', ' ', title).strip().title()

    tags = _detect_tags(content)
    lines = len(content.strip().split('\n'))
    difficulty = 'Easy' if lines < 30 else 'Medium' if lines < 80 else 'Hard'
    approaches = _extract_approaches(content, language)

    deep_analysis = {
        "overall_summary": (
            f"Heuristic analysis of {filename}. {len(approaches)} approach(es) detected. "
            f"For a full AI-powered deep analysis with line-by-line breakdown, ensure your "
            f"GROQ_API_KEY is set in the .env file and rebuild the Docker container."
        ),
        "approaches": [
            {
                "approach_name": a["approach_name"],
                "summary": a["explanation"] or f"Approach: {a['approach_name']}",
                "time_complexity": a.get("time_complexity", ""),
                "space_complexity": a.get("space_complexity", ""),
                "line_breakdown": [],
            }
            for a in approaches
        ],
        "key_insights": [
            "⚠️ This analysis was generated by heuristic pattern matching (no AI).",
            "Set GROQ_API_KEY in your .env file and rebuild Docker for AI analysis.",
        ],
        "common_mistakes": [],
    }

    return {
        'title': title,
        'problem_statement': f'# {title}\n\n*Heuristic analysis — upload with AI key for detailed description.*\n\nSolution file: `{filename}`',
        'difficulty': difficulty,
        'dsa_tags': tags[:5],
        'extracted_approaches': approaches,
        'generated_test_cases': [],
        'deep_analysis': deep_analysis,
    }


def _detect_tags(content: str) -> list:
    """Detect DSA tags from code patterns."""
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
        'Two Pointers': [r'left.*right', r'i.*j.*while'],
        'Sorting': [r'sort\(', r'sorted\(', r'Arrays\.sort'],
        'Backtracking': [r'backtrack', r'permut', r'combinat'],
        'Sliding Window': [r'window', r'sliding'],
        'Heap': [r'priority_queue', r'heapq', r'PriorityQueue'],
    }
    for tag, pats in patterns.items():
        for pat in pats:
            if re.search(pat, content, re.IGNORECASE):
                tags.append(tag)
                break
    return tags if tags else ['General']


def _extract_approaches(content: str, language: str) -> list:
    """Extract multiple approaches from commented blocks in a file."""
    approaches = []

    if language in ('cpp', 'java', 'c'):
        blocks = re.split(
            r'(?:^|\n)\s*(?://|/\*)\s*(?:Approach|Method|Solution|Way)\s*\d*\s*[:\-]?\s*',
            content, flags=re.IGNORECASE
        )
    elif language == 'python':
        blocks = re.split(
            r'(?:^|\n)\s*#\s*(?:Approach|Method|Solution|Way)\s*\d*\s*[:\-]?\s*',
            content, flags=re.IGNORECASE
        )
    else:
        blocks = [content]

    if len(blocks) <= 1:
        blocks = re.split(r'\n\s*(?://\s*[-=]{5,}|#\s*[-=]{5,}|/\*\s*[-=]{5,})', content)

    if len(blocks) <= 1:
        commented = _extract_commented_code(content, language)
        if commented:
            approaches.append({
                'approach_name': 'Active Solution',
                'raw_code': _strip_comments_from_active(content, language),
                'time_complexity': _guess_complexity(content),
                'space_complexity': '',
                'explanation': 'The currently active (uncommented) solution.',
            })
            for i, block in enumerate(commented):
                approaches.append({
                    'approach_name': f'Alternative Approach {i + 1}',
                    'raw_code': block,
                    'time_complexity': '',
                    'space_complexity': '',
                    'explanation': 'Commented-out alternative solution.',
                })
        else:
            approaches.append({
                'approach_name': 'Original Solution',
                'raw_code': content.strip(),
                'time_complexity': _guess_complexity(content),
                'space_complexity': '',
                'explanation': 'Complete solution as uploaded.',
            })
    else:
        for i, block in enumerate(blocks):
            block = block.strip()
            if not block or len(block) < 10:
                continue
            first_line = block.split('\n')[0].strip()
            name = re.sub(r'^[/#\*\s]+', '', first_line).strip()
            name = name if name and len(name) < 80 else f'Approach {i}'
            approaches.append({
                'approach_name': name,
                'raw_code': block,
                'time_complexity': _guess_complexity(block),
                'space_complexity': '',
                'explanation': '',
            })

    return approaches


def _extract_commented_code(content: str, language: str) -> list:
    """Extract large blocks of commented-out code (>3 lines)."""
    blocks = []
    current_block = []
    for line in content.split('\n'):
        stripped = line.strip()
        is_comment = False
        if language in ('cpp', 'java', 'c'):
            is_comment = stripped.startswith('//')
        elif language == 'python':
            is_comment = stripped.startswith('#')
        if is_comment:
            if language in ('cpp', 'java', 'c'):
                current_block.append(re.sub(r'^//\s?', '', stripped))
            else:
                current_block.append(re.sub(r'^#\s?', '', stripped))
        else:
            if len(current_block) >= 3:
                code = '\n'.join(current_block)
                if re.search(r'[{(;=]|def |class |return |if |for |while ', code):
                    blocks.append(code)
            current_block = []
    if len(current_block) >= 3:
        code = '\n'.join(current_block)
        if re.search(r'[{(;=]|def |class |return |if |for |while ', code):
            blocks.append(code)
    return blocks


def _strip_comments_from_active(content: str, language: str) -> str:
    lines = []
    for line in content.split('\n'):
        stripped = line.strip()
        if language in ('cpp', 'java', 'c') and stripped.startswith('//'):
            continue
        if language == 'python' and stripped.startswith('#'):
            continue
        lines.append(line)
    return '\n'.join(lines).strip()


def _guess_complexity(code: str) -> str:
    nested_loops = len(re.findall(r'for\s*\(|for\s+\w+\s+in|while\s*\(', code))
    if nested_loops >= 3:
        return 'O(n³)'
    if nested_loops >= 2:
        return 'O(n²)'
    if re.search(r'binary.?search|low.*high.*mid', code, re.IGNORECASE):
        return 'O(log n)'
    if re.search(r'sort\(|sorted\(', code):
        return 'O(n log n)'
    if nested_loops >= 1:
        return 'O(n)'
    return ''
