"""
Caption Generator using OpenAI Whisper
Generates subtitles/captions in Mongolian and English
"""

import subprocess
import tempfile
import os
from pathlib import Path
from typing import Optional
import json


def extract_audio(input_path: str, output_path: str) -> bool:
    """Extract audio from video file."""
    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0


def format_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_srt(segments: list, output_path: str) -> None:
    """Generate SRT subtitle file from segments."""
    with open(output_path, "w", encoding="utf-8") as f:
        for i, segment in enumerate(segments, 1):
            start = format_timestamp(segment["start"])
            end = format_timestamp(segment["end"])
            text = segment["text"].strip()

            f.write(f"{i}\n")
            f.write(f"{start} --> {end}\n")
            f.write(f"{text}\n\n")


def generate_vtt(segments: list, output_path: str) -> None:
    """Generate WebVTT subtitle file from segments."""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")

        for i, segment in enumerate(segments, 1):
            start = format_timestamp(segment["start"]).replace(",", ".")
            end = format_timestamp(segment["end"]).replace(",", ".")
            text = segment["text"].strip()

            f.write(f"{i}\n")
            f.write(f"{start} --> {end}\n")
            f.write(f"{text}\n\n")


def generate_captions(
    input_path: str,
    output_dir: str,
    language: Optional[str] = None,
    model_size: str = "base"
) -> dict:
    """
    Generate captions for a video file using Whisper.

    Args:
        input_path: Path to input video file
        output_dir: Directory to save caption files
        language: Language code (e.g., 'mn' for Mongolian, 'en' for English)
                  If None, Whisper will auto-detect
        model_size: Whisper model size ('tiny', 'base', 'small', 'medium', 'large')

    Returns:
        Dictionary with paths to generated caption files
    """
    try:
        import whisper
    except ImportError:
        return {
            "success": False,
            "error": "Whisper not installed. Run: pip install openai-whisper"
        }

    os.makedirs(output_dir, exist_ok=True)

    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract audio
        audio_path = os.path.join(temp_dir, "audio.wav")
        if not extract_audio(input_path, audio_path):
            return {
                "success": False,
                "error": "Failed to extract audio from video"
            }

        # Load Whisper model
        print(f"Loading Whisper model: {model_size}")
        model = whisper.load_model(model_size)

        # Transcribe
        print("Transcribing audio...")
        transcribe_options = {
            "verbose": True,
            "word_timestamps": True,
        }

        if language:
            transcribe_options["language"] = language

        result = model.transcribe(audio_path, **transcribe_options)

        # Get detected language
        detected_language = result.get("language", "unknown")

        # Generate caption files
        base_name = Path(input_path).stem
        lang_suffix = language or detected_language

        srt_path = os.path.join(output_dir, f"{base_name}_{lang_suffix}.srt")
        vtt_path = os.path.join(output_dir, f"{base_name}_{lang_suffix}.vtt")
        json_path = os.path.join(output_dir, f"{base_name}_{lang_suffix}.json")

        # Generate SRT
        generate_srt(result["segments"], srt_path)

        # Generate VTT
        generate_vtt(result["segments"], vtt_path)

        # Save full transcript as JSON
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump({
                "language": detected_language,
                "text": result["text"],
                "segments": result["segments"]
            }, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "language": detected_language,
            "srt_path": srt_path,
            "vtt_path": vtt_path,
            "json_path": json_path,
            "full_text": result["text"],
            "segment_count": len(result["segments"])
        }


def generate_bilingual_captions(
    input_path: str,
    output_dir: str,
    model_size: str = "base"
) -> dict:
    """
    Generate captions in both Mongolian and English.

    For videos in Mongolian, generates:
    - Mongolian captions (original)
    - English translation

    Args:
        input_path: Path to input video file
        output_dir: Directory to save caption files
        model_size: Whisper model size

    Returns:
        Dictionary with paths to generated caption files
    """
    try:
        import whisper
    except ImportError:
        return {
            "success": False,
            "error": "Whisper not installed. Run: pip install openai-whisper"
        }

    results = {}

    # First, detect language and generate original captions
    original_result = generate_captions(
        input_path,
        output_dir,
        language=None,  # Auto-detect
        model_size=model_size
    )

    if not original_result.get("success"):
        return original_result

    results["original"] = original_result
    detected_language = original_result.get("language", "unknown")

    # If detected language is Mongolian, also generate English translation
    # Whisper can translate to English directly
    if detected_language == "mn" or detected_language == "mongolian":
        print("Generating English translation...")

        with tempfile.TemporaryDirectory() as temp_dir:
            audio_path = os.path.join(temp_dir, "audio.wav")
            extract_audio(input_path, audio_path)

            model = whisper.load_model(model_size)

            # Use task="translate" for translation to English
            result = model.transcribe(
                audio_path,
                task="translate",
                verbose=True
            )

            base_name = Path(input_path).stem
            srt_path = os.path.join(output_dir, f"{base_name}_en_translated.srt")
            vtt_path = os.path.join(output_dir, f"{base_name}_en_translated.vtt")

            generate_srt(result["segments"], srt_path)
            generate_vtt(result["segments"], vtt_path)

            results["english_translation"] = {
                "success": True,
                "srt_path": srt_path,
                "vtt_path": vtt_path,
                "full_text": result["text"],
                "segment_count": len(result["segments"])
            }

    results["success"] = True
    return results


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python caption_generator.py <input_video> <output_dir> [language]")
        print("Languages: mn (Mongolian), en (English), or auto-detect if not specified")
        sys.exit(1)

    input_file = sys.argv[1]
    output_directory = sys.argv[2]
    lang = sys.argv[3] if len(sys.argv) > 3 else None

    result = generate_captions(input_file, output_directory, language=lang)
    print(f"Result: {json.dumps(result, indent=2)}")
