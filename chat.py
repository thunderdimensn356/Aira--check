import os

from google import genai
from google.genai import types

from persona import get_persona
from response_formatter import render_response
from speech_bridge import speak_response
from app_launcher import handle_app_command, execute_am_markers
from voice_input import listen_or_type


# ============================================================
# API ROTATION ORDER
# ============================================================

API_ORDER = ["4", "5", "7", "1", "2", "3", "6"]


# ============================================================
# MODEL COMPATIBILITY MATRIX
#
# This is based on the latest test.py result you provided.
#
# ✓ = model was working for that API
# ✗ = model was unavailable/temporary/not usable
# ============================================================

API_MODELS = {
    "1": [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
        "gemini-flash-latest",
    ],

    "2": [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
    ],

    "3": [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-flash-latest",
    ],

    "4": [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.8-flash",
        "gemini-flash-latest",
    ],

    "5": [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
    ],

    "6": [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.8-flash",
        "gemini-flash-latest",
    ],

    "7": [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.8-flash",
    ],
}


# ============================================================
# MODEL PREFERENCE
# ============================================================

CODING_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
]


GENERAL_MODELS = [
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
]


# ============================================================
# CODING DETECTION
# ============================================================

CODING_WORDS = {
    "code",
    "coding",
    "python",
    "script",
    "program",
    "function",
    "class",
    "debug",
    "debugging",
    "bug",
    "error",
    "syntax",
    "terminal",
    "command",
    "javascript",
    "js",
    "html",
    "css",
    "json",
    "api",
    "regex",
    "algorithm",
    "variable",
    "module",
    "package",
    "library",
    "import",
    "exception",
    "traceback",
}


def is_coding_request(text: str) -> bool:
    text_lower = text.lower()

    words = set(text_lower.split())

    if words & CODING_WORDS:
        return True

    code_markers = [
        "```",
        "def ",
        "class ",
        "import ",
        "from ",
        "print(",
        "if __name__",
        "async def",
        "await ",
        "npm ",
        "pip ",
        "git ",
        "curl ",
    ]

    return any(
        marker in text_lower
        for marker in code_markers
    )


def choose_model_list(user_text: str):
    if is_coding_request(user_text):
        return CODING_MODELS

    return GENERAL_MODELS


# ============================================================
# GET MODELS FOR CURRENT API
# ============================================================

def models_for_api(api_id: str, preferred_models: list[str]):
    supported = API_MODELS.get(api_id, [])

    if not supported:
        return []

    supported_set = set(supported)

    # Preserve preference order while respecting
    # actual API/model compatibility.
    models = [
        model
        for model in preferred_models
        if model in supported_set
    ]

    # If preferred list has no match, use all models
    # known to work on this API.
    if not models:
        return supported.copy()

    return models


# ============================================================
# ERROR CLASSIFICATION
# ============================================================

def classify_error(error) -> str:
    message = str(error).lower()

    if "401" in message or "403" in message:
        return "AUTH"

    if "429" in message:
        return "RATE_LIMIT"

    if "503" in message:
        return "TEMPORARY"

    if "404" in message:
        return "NOT_FOUND"

    if "400" in message:
        return "INVALID_REQUEST"

    if "500" in message:
        return "SERVER_ERROR"

    return "ERROR"


# ============================================================
# API ROTATOR
# ============================================================

class APIRotator:

    def __init__(self, keys: dict):
        self.keys = keys
        self.index = 0

    def next_key(self):
        if not self.keys:
            return None, None

        total = len(API_ORDER)

        for _ in range(total):

            api_id = API_ORDER[
                self.index % total
            ]

            self.index = (
                self.index + 1
            ) % total

            api_key = self.keys.get(api_id)

            if api_key:
                return api_id, api_key

        return None, None


# ============================================================
# AI CHAT
# ============================================================

class AIChat:

    def __init__(self):

        self.keys = self.load_keys()

        self.rotator = APIRotator(
            self.keys
        )

        self.persona = get_persona()

        self.history = []

    # --------------------------------------------------------
    # LOAD API KEYS
    # --------------------------------------------------------

    def load_keys(self):

        keys = {}

        api_file = "api"

        if not os.path.exists(api_file):
            raise FileNotFoundError(
                "API key file 'api' was not found."
            )

        with open(
            api_file,
            "r",
            encoding="utf-8"
        ) as file:

            for line in file:

                line = line.strip()

                if not line:
                    continue

                if "=" not in line:
                    continue

                key_id, api_key = line.split(
                    "=",
                    1
                )

                key_id = key_id.strip()

                api_key = (
                    api_key
                    .strip()
                    .strip('"')
                    .strip("'")
                )

                if key_id and api_key:
                    keys[key_id] = api_key

        return keys

    # --------------------------------------------------------
    # BUILD HISTORY
    # --------------------------------------------------------

    def build_contents(self, user_text):

        contents = []

        for item in self.history[-10:]:

            contents.append(
                types.Content(
                    role=item["role"],
                    parts=[
                        types.Part.from_text(
                            text=item["text"]
                        )
                    ],
                )
            )

        # IMPORTANT:
        # Keep complete multiline input.
        contents.append(
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(
                        text=user_text
                    )
                ],
            )
        )

        return contents

    # --------------------------------------------------------
    # GENERATE
    # --------------------------------------------------------

    def generate(self, user_text):

        user_text = user_text.strip()

        if not user_text:
            return "Please enter something."

        preferred_models = choose_model_list(
            user_text
        )

        contents = self.build_contents(
            user_text
        )

        # Each API gets one complete chance.
        max_api_attempts = len(self.keys)

        api_attempt = 0

        while api_attempt < max_api_attempts:

            api_id, api_key = (
                self.rotator.next_key()
            )

            if not api_id or not api_key:
                break

            models = models_for_api(
                api_id,
                preferred_models
            )

            if not models:

                api_attempt += 1
                continue

            # ------------------------------------------------
            # CREATE CLIENT
            # ------------------------------------------------

            try:

                client = genai.Client(
                    api_key=api_key
                )

            except Exception as error:

                error_type = classify_error(
                    error
                )

                print(
                    f"[api {api_id} | "
                    f"client -> {error_type}]"
                )

                api_attempt += 1
                continue

            # ------------------------------------------------
            # MODEL ROTATION
            #
            # THIS IS THE IMPORTANT PART.
            #
            # Same API:
            #
            # model 1 -> fail
            # model 2 -> fail
            # model 3 -> success
            #
            # Only after ALL models fail do we
            # move to the next API.
            # ------------------------------------------------

            for model in models:

                try:

                    response = (
                        client.models.generate_content(
                            model=model,
                            contents=contents,
                            config=(
                                types.GenerateContentConfig(
                                    system_instruction=(
                                        self.persona
                                    ),
                                    temperature=0.7,
                                    max_output_tokens=2048,
                                )
                            ),
                        )
                    )

                    answer = getattr(
                        response,
                        "text",
                        None
                    )

                    if answer and answer.strip():

                        answer = answer.strip()

                        self.history.append(
                            {
                                "role": "user",
                                "text": user_text,
                            }
                        )

                        self.history.append(
                            {
                                "role": "model",
                                "text": answer,
                            }
                        )

                        print(
                            f"\n[model: {model} "
                            f"| api: {api_id}]\n"
                        )

                        return answer

                    print(
                        f"[api {api_id} | "
                        f"model {model} -> EMPTY]"
                    )

                except Exception as error:

                    error_type = classify_error(
                        error
                    )

                    print(
                        f"[api {api_id} | "
                        f"model {model} "
                        f"-> {error_type}]"
                    )

                    # NEXT MODEL ON SAME API
                    continue

            # ------------------------------------------------
            # Every model on this API failed.
            # Move to next API.
            # ------------------------------------------------

            api_attempt += 1

        return (
            "I couldn't get a response right now. "
            "All available API and model "
            "combinations failed."
        )


# ============================================================
# MAIN
# ============================================================

def main():

    print("Aira chat started.")
    print("Type /exit to quit.")
    print()

    ai = AIChat()

    while True:

        try:

            user_text = listen_or_type()

        except (
            KeyboardInterrupt,
            EOFError
        ):

            print()
            print("Aira chat stopped.")
            break

        user_text = user_text.strip()

        if not user_text:
            continue

        if user_text.lower() == "/exit":

            print("Aira chat stopped.")
            break

        # ----------------------------------------------------
        # LOCAL APP COMMAND
        # ----------------------------------------------------

        try:

            handled = handle_app_command(
                user_text
            )

        except Exception:

            handled = False

        if handled:
            continue

        # ----------------------------------------------------
        # AI
        # ----------------------------------------------------

        answer = ai.generate(
            user_text
        )

        answer = execute_am_markers(
            answer
        )

        render_response(
            answer
        )

        # ----------------------------------------------------
        # TTS
        # ----------------------------------------------------

        try:

            speak_response(
                answer
            )

        except Exception as error:

            print(
                f"[speech error: {error}]"
            )


if __name__ == "__main__":
    raise SystemExit(main())
