"""
Aira Speech Bridge
------------------
Connects Aira's chat response to the appropriate TTS engine.

Flow:

Gemini response
      ↓
speech_bridge.py
      ↓
speech text cleanup
      ↓
Hindi/Hinglish → Edge-TTS
English       → Pocket TTS + Estelle
      ↓
audio playback

The chat response itself is never modified.
Only the text sent to TTS is lightly prepared for speech.
"""

import re
import shutil
import subprocess
from pathlib import Path

from tts import generate_speech as generate_pocket_speech


BASE_DIR = Path(__file__).resolve().parent

DEFAULT_VOICE = BASE_DIR / "estelle.wav"
DEFAULT_OUTPUT = BASE_DIR / "bn" / "aira_output.wav"

HINDI_NEURAL_VOICE = "hi-IN-SwaraNeural"


# ---------------------------------------------------------
# Language detection
# ---------------------------------------------------------

def is_hindi_response(text: str) -> bool:
    """
    Detect Hindi/Hinglish speech.

    Devanagari text is always treated as Hindi.

    For Roman Hindi/Hinglish, a small keyword set is used.
    """

    if re.search(r"[\u0900-\u097F]", text):
        return True

    hinglish_keywords = {
        "hai", "hain", "hoon", "ho",
        "kaise", "kya", "kyun",
        "mein", "main",
        "tum", "tumhara", "tumhari",
        "aap", "aapka", "aapki",
        "baat", "batao",
        "socha", "soch",
        "raha", "rahi",
        "karna", "karo", "kar",
        "haan", "nahi",
        "accha", "achha",
        "samajh", "samjha",
        "suno",
        "pagal",
        "meri", "mera", "mere",
        "kisi", "bhi",
        "thoda", "thodi",
        "kyunki",
        "lekin",
        "par",
        "abhi",
        "phir",
        "kuch",
        "kahan",
        "kab",
        "kaafi",
        "zyada",
        "kam",
    }

    words = re.findall(r"\b[a-zA-Z]+\b", text.lower())

    match_count = sum(
        1 for word in words
        if word in hinglish_keywords
    )

    return match_count > 0


# ---------------------------------------------------------
# Speech text preparation
# ---------------------------------------------------------

def prepare_speech_text(text: str) -> str:
    """
    Lightly prepare AI text for natural speech.

    Important:
    This does NOT rewrite Aira's response.
    It only removes formatting that sounds unnatural
    when passed directly to a TTS engine.
    """

    if not text:
        return ""

    speech = text.strip()

    # Remove Markdown code fences.
    speech = re.sub(r"```[\w+-]*", "", speech)
    speech = speech.replace("```", "")

    # Remove Markdown headings.
    speech = re.sub(
        r"^\s*#{1,6}\s*",
        "",
        speech,
        flags=re.MULTILINE,
    )

    # Convert Markdown bullets into natural pauses.
    speech = re.sub(
        r"^\s*[-*+]\s+",
        "",
        speech,
        flags=re.MULTILINE,
    )

    # Remove excessive whitespace.
    speech = re.sub(r"[ \t]+", " ", speech)

    # Keep paragraph separation natural.
    speech = re.sub(r"\n{3,}", "\n\n", speech)

    # Avoid awkward spaces before punctuation.
    speech = re.sub(r"\s+([,.!?;:])", r"\1", speech)

    # Avoid excessive punctuation that can create strange TTS pauses.
    speech = re.sub(r"!{2,}", "!", speech)
    speech = re.sub(r"\?{2,}", "?", speech)
    speech = re.sub(r"\.{4,}", "...", speech)

    return speech.strip()


# ---------------------------------------------------------
# Edge-TTS
# ---------------------------------------------------------

def generate_edge_tts_cli(
    text: str,
    output_path: Path,
) -> bool:
    """
    Generate Hindi/Hinglish speech using Edge-TTS CLI.
    """

    try:
        command = [
            "edge-tts",
            "--voice",
            HINDI_NEURAL_VOICE,
            "--text",
            text,
            "--write-media",
            str(output_path),
        ]

        subprocess.run(
            command,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        return True

    except Exception:
        return False


# ---------------------------------------------------------
# Audio playback
# ---------------------------------------------------------

def play_audio(audio_path: Path) -> None:
    """
    Play generated audio using an available media player.
    """

    audio_str = str(audio_path)

    if shutil.which("mpv"):
        subprocess.run(
            ["mpv", "--really-quiet", audio_str],
            check=False,
        )

    elif shutil.which("aplay"):
        subprocess.run(
            ["aplay", "-q", audio_str],
            check=False,
        )

    elif shutil.which("ffplay"):
        subprocess.run(
            [
                "ffplay",
                "-nodisp",
                "-autoexit",
                "-loglevel",
                "quiet",
                audio_str,
            ],
            check=False,
        )


# ---------------------------------------------------------
# Main speech function
# ---------------------------------------------------------

def speak_response(
    text: str,
    voice_path: str | Path = DEFAULT_VOICE,
    output_path: str | Path = DEFAULT_OUTPUT,
    play_in_terminal: bool = True,
) -> None:
    """
    Speak Aira's response.

    The original response remains untouched.
    Only a speech-specific copy is prepared for TTS.
    """

    if not text or not text.strip():
        return

    output_path = Path(output_path)

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Prepare only the TTS version.
    speech_text = prepare_speech_text(text)

    if not speech_text:
        return

    # -----------------------------------------------------
    # Hindi / Hinglish
    # -----------------------------------------------------

    if is_hindi_response(speech_text):

        success = generate_edge_tts_cli(
            speech_text,
            output_path,
        )

        # Pocket TTS fallback if Edge-TTS fails.
        if not success:
            generate_pocket_speech(
                text=speech_text,
                voice_path=str(voice_path),
                output_path=str(output_path),
            )

    # -----------------------------------------------------
    # English
    # -----------------------------------------------------

    else:

        generate_pocket_speech(
            text=speech_text,
            voice_path=str(voice_path),
            output_path=str(output_path),
        )

    # -----------------------------------------------------
    # Playback
    # -----------------------------------------------------

    if play_in_terminal:
        play_audio(output_path)


# ---------------------------------------------------------
# Direct test
# ---------------------------------------------------------

if __name__ == "__main__":
    print("Aira Speech Bridge ready.")
