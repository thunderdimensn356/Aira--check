import re
import shutil
import textwrap


# ─────────────────────────────────────────────
# ANSI styles
# ─────────────────────────────────────────────

RESET = "\033[0m"
CODE_COLOR = "\033[38;5;203m"   # soft red
DIM = "\033[2m"


CODE_BLOCK_PATTERN = re.compile(
    r"```([a-zA-Z0-9_+#.-]*)[ \t]*\n?(.*?)```",
    re.DOTALL,
)


def terminal_width():
    """Get terminal width safely."""
    try:
        return shutil.get_terminal_size((80, 20)).columns
    except Exception:
        return 80


def clean_code(code):
    """Remove unnecessary common indentation."""
    code = code.replace("\r\n", "\n").replace("\r", "\n")
    code = textwrap.dedent(code)
    return code.strip("\n")


def print_code(code):
    """
    Render code without boxes.

    The code is:
    - indented
    - softly highlighted
    - visually separated from normal text
    """

    code = clean_code(code)

    if not code:
        return

    print()

    for line in code.splitlines():
        # Keep empty lines inside code.
        if line.strip():
            print(f"    {CODE_COLOR}{line}{RESET}")
        else:
            print()

    print()


def clean_markdown_line(line):
    """Make common Markdown formatting cleaner for terminal output."""

    # Markdown headings
    if re.match(r"^\s*#{1,6}\s+", line):
        line = re.sub(r"^\s*#{1,6}\s+", "", line)

    # Horizontal rules
    if re.match(r"^\s*([-*_])(?:\s*\1){2,}\s*$", line):
        return "────────────────────────"

    # Markdown bullets
    line = re.sub(r"^(\s*)[-*+]\s+", r"\1• ", line)

    return line


def print_text(text):
    """Print normal response text."""

    if not text:
        return

    text = text.replace("\r\n", "\n").replace("\r", "\n")

    for line in text.splitlines():
        print(clean_markdown_line(line))

    print()


def render_response(response):
    """
    Convert Gemini Markdown response into Aira terminal style.

    Code blocks:
        ```python
        print("Hello")
        ```

    become:

        print("Hello")

    with subtle red highlighting and no surrounding box.
    """

    if not response:
        return

    response = str(response)

    position = 0

    for match in CODE_BLOCK_PATTERN.finditer(response):
        # Normal text before code
        before_code = response[position:match.start()]

        if before_code.strip():
            print_text(before_code)

        # Extract code
        code = match.group(2)

        print_code(code)

        position = match.end()

    # Remaining normal text
    remaining = response[position:]

    if remaining.strip():
        print_text(remaining)
