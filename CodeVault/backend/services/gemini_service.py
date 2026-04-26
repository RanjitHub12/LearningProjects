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
EXTRACTION_PROMPT = """You are an expert competitive programming and DSA code analyzer for a reverse-LeetCode platform called CodeVault. You MUST produce highly detailed, educational analysis.

Given a code file, perform an exhaustive deep-scan:

## 1. Problem Identification
- Identify the EXACT algorithmic problem (e.g., "Valid Parentheses", "Two Sum", "Longest Palindromic Substring")
- Do NOT use the filename as the title — infer the actual problem name from the code logic
- Write a comprehensive problem statement in Markdown with:
  - Clear problem description (2-3 paragraphs)
  - Input/output format
  - Constraints (infer from code patterns)
  - 2-3 examples with explanations

## 2. Multi-Approach Extraction
Scan the ENTIRE file for multiple solutions:
- Look for commented-out code blocks representing alternative approaches
- Look for multiple functions solving the same problem differently
- Look for labels like "Approach 1", "Brute Force", "Optimized", etc.
- If commented-out code exists, UNCOMMENT it and make it executable
- Even without labels, detect approaches from code patterns (recursion vs DP vs greedy)
- Give each approach a DESCRIPTIVE name (e.g., "Stack-Based O(n) Solution", "Brute Force Nested Loops")

## 3. For EACH approach provide:
- Descriptive approach name
- Complete, standalone, executable code
- Time complexity with justification
- Space complexity with justification
- Detailed explanation (3-5 sentences minimum) covering WHY this approach works

## 4. Classification
- Difficulty: Easy/Medium/Hard/Impossible (based on actual LeetCode-style classification)
- DSA tags from: [Array, String, DP, Tree, Graph, Stack, Queue, Linked List, Binary Search, Hash Map, Heap, Greedy, Recursion, Backtracking, Sorting, Two Pointers, Sliding Window, Bit Manipulation, Math, Trie, Union Find, Design]

## 5. Test Cases
Generate 3-5 test cases including:
- Basic case
- Edge cases (empty input, single element, max size)
- Tricky cases
Each with clear explanation of what it tests

## 6. Deep Analysis
For each approach provide:
- Detailed summary (paragraph)
- Key insights about the approach
- Line-by-line breakdown of the MOST IMPORTANT 10-20 lines

Return ONLY valid JSON in this exact structure:
{
  "title": "Valid Parentheses",
  "problem_statement": "# Valid Parentheses\\n\\nGiven a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\\n\\nAn input string is valid if:\\n1. Open brackets must be closed by the same type of brackets.\\n2. Open brackets must be closed in the correct order.\\n3. Every close bracket has a corresponding open bracket of the same type.\\n\\n## Constraints\\n- `1 <= s.length <= 10^4`\\n- `s` consists of parentheses only `()[]{}`.\\n\\n## Examples\\n\\n**Example 1:**\\n- Input: s = \\"()\\"\\n- Output: true\\n\\n**Example 2:**\\n- Input: s = \\"()[]{}\\"\\n- Output: true\\n\\n**Example 3:**\\n- Input: s = \\"(]\\"\\n- Output: false",
  "difficulty": "Easy",
  "dsa_tags": ["Stack", "String"],
  "extracted_approaches": [
    {
      "approach_name": "Stack-Based Matching",
      "raw_code": "full executable code here",
      "time_complexity": "O(n)",
      "space_complexity": "O(n)",
      "explanation": "We use a stack to track opening brackets. For each closing bracket, we check if it matches the top of the stack. If the stack is empty at the end, all brackets were matched correctly. This works because brackets must be matched in LIFO order, which is exactly what a stack provides."
    }
  ],
  "generated_test_cases": [
    {"input": "()", "expected_output": "true", "explanation": "Basic matching pair"},
    {"input": "([)]", "expected_output": "false", "explanation": "Interleaved brackets - order matters"},
    {"input": "", "expected_output": "true", "explanation": "Edge case: empty string is valid"},
    {"input": "((((", "expected_output": "false", "explanation": "All opening, no closing brackets"}
  ],
  "deep_analysis": {
    "overall_summary": "This problem tests understanding of stack data structure for bracket matching. The key insight is that valid bracket sequences follow LIFO ordering, making a stack the natural choice. The optimal solution runs in O(n) time with O(n) space.",
    "approaches": [
      {
        "approach_name": "Stack-Based Matching",
        "summary": "Uses a stack to maintain opening brackets. When a closing bracket is encountered, we pop from the stack and verify the match. This elegantly handles nested brackets of any depth.",
        "time_complexity": "O(n)",
        "space_complexity": "O(n)",
        "line_breakdown": [
          {"line_number": 1, "code": "stack<char> st;", "explanation": "Initialize an empty stack to hold opening brackets as we encounter them"},
          {"line_number": 2, "code": "for(char c : s)", "explanation": "Iterate through each character in the input string exactly once"},
          {"line_number": 3, "code": "if(c == '(' || c == '{' || c == '[')", "explanation": "Check if current character is an opening bracket"},
          {"line_number": 4, "code": "st.push(c);", "explanation": "Push opening brackets onto the stack for later matching"},
          {"line_number": 5, "code": "else if(st.empty() || st.top() != match)", "explanation": "For closing brackets: if stack is empty (no opener) or top doesn't match, string is invalid"}
        ]
      }
    ],
    "key_insights": [
      "Bracket matching requires LIFO ordering — a stack is the perfect data structure",
      "We can optimize by mapping closing brackets to their opening counterparts",
      "Early termination: if we encounter a mismatch, we can return false immediately",
      "Final check: the stack must be empty — unmatched opening brackets mean invalid input"
    ],
    "common_mistakes": [
      "Forgetting to check if the stack is empty before popping (causes runtime error)",
      "Only checking for matching pairs without verifying correct nesting order",
      "Not handling the edge case of a string with only opening brackets",
      "Using a counter instead of a stack — this fails for interleaved brackets like ([)]"
    ]
  }
}

CRITICAL RULES:
- The title MUST be the actual problem name, NOT the filename
- The problem_statement MUST be detailed with examples and constraints
- The explanation for each approach MUST be at least 3 sentences
- Generate AT LEAST 3 test cases with explanations
- The deep_analysis MUST include key_insights and common_mistakes"""


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
        max_tokens=16000,
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
