import argparse
import subprocess
import wave
from pathlib import Path

import torch

from pocket_tts import TTSModel

SAMPLE_RATE = 24000
DEFAULT_VOICE = "estelle.wav"
DEFAULT_OUTPUT = "output.wav"


def save_wav(audio: torch.Tensor, output_path: str) -> None:
    audio = audio.detach().cpu().float()

    if audio.ndim == 2:
        if audio.shape[0] == 1:
            audio = audio.squeeze(0)
        else:
            raise RuntimeError(
                f"Expected mono audio, got shape: {tuple(audio.shape)}"
            )

    if audio.ndim != 1:
        raise RuntimeError(
            f"Unexpected audio shape: {tuple(audio.shape)}"
        )

    audio = torch.clamp(audio, -1.0, 1.0)
    pcm = (audio * 32767.0).to(torch.int16)

    raw_audio = pcm.numpy().tobytes()

    with wave.open(output_path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(raw_audio)


def play_audio(output_path: str) -> None:
    try:
       subprocess.run(
           ["play", output_path, "gain", "8"],
           check=False,
           stdout=subprocess.DEVNULL,
           stderr=subprocess.DEVNULL,
       )
    except FileNotFoundError:
        raise RuntimeError("'play' command was not found.")


def generate_speech(
    text: str,
    voice_path: str,
    output_path: str
) -> None:

    voice = Path(voice_path)

    if not voice.exists():
        raise FileNotFoundError(
            f"Voice file not found: {voice}"
        )

    if not text.strip():
        raise ValueError("Text cannot be empty.")

    model = TTSModel.load_model()

    voice_state = model.get_state_for_audio_prompt(
        str(voice)
    )

    audio = model.generate_audio(
        voice_state,
        text
    )

    if not isinstance(audio, torch.Tensor):
        audio = torch.as_tensor(audio)

    save_wav(
        audio,
        output_path
    )

    play_audio(output_path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Pocket TTS voice generator using Estelle."
    )

    parser.add_argument(
        "text",
        nargs="?",
        help="Text to convert to speech."
    )

    parser.add_argument(
        "-f",
        "--file",
        help="Read text from a UTF-8 text file."
    )

    parser.add_argument(
        "-o",
        "--output",
        default=DEFAULT_OUTPUT,
        help=f"Output WAV file. Default: {DEFAULT_OUTPUT}"
    )

    parser.add_argument(
        "--voice",
        default=DEFAULT_VOICE,
        help=f"Reference voice WAV. Default: {DEFAULT_VOICE}"
    )

    args = parser.parse_args()

    if args.file:
        text = Path(args.file).read_text(
            encoding="utf-8"
        )
    elif args.text:
        text = args.text
    else:
        text = input("Text: ")

    try:
        generate_speech(
            text=text,
            voice_path=args.voice,
            output_path=args.output
        )

    except KeyboardInterrupt:
        print("\nCancelled.")
        return 130

    except Exception as exc:
        print(f"\nError: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
