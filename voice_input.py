"""
voice_input.py
Aira ko bolkar command dene ke liye. Termux:API (termux-speech-to-text)
use karta hai. Isse chat.py sirf import karega.

Requirement (ek baar setup karo):
1. Play Store se "Termux:API" app install karo.
2. Termux me: pkg install termux-api
"""

import subprocess


def listen_command(prompt="[Aira sun rahi hai...]"):
    """
    Microphone se bolkar text leta hai.
    Return: recognized text (string), ya khaali string "" agar
    kuch samajh nahi aaya / error aaya.
    """
    print(f"\033[2m{prompt}\033[0m")

    try:
        result = subprocess.run(
            ["termux-speech-to-text"],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except FileNotFoundError:
        print(
            "\033[2m[Termux:API install nahi hai. "
            "Play Store se 'Termux:API' app + `pkg install termux-api` chalao]\033[0m"
        )
        return ""
    except subprocess.TimeoutExpired:
        print("\033[2m[Sunne me zyada time laga, dobara try karo]\033[0m")
        return ""

    text = result.stdout.strip()

    if not text:
        print("\033[2m[Kuch samajh nahi aaya, dobara bolo]\033[0m")

    return text


def listen_or_type(prompt_label="\033[2m[You: ]\033[0m"):
    """
    Pehle bolkar try karta hai; agar khaali aaye to type karne ka option deta hai.
    Chat.py ke input() ki jagah seedha isko use kar sakte ho.
    """
    text = listen_command()

    if not text:
        text = input(prompt_label).strip()

    return text
