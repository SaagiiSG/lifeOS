"""
Caption Generator using OpenAI Whisper API
Generates subtitles/captions in Mongolian and English
"""

import subprocess
import tempfile
import os
from pathlib import Path
from typing import Optional
import json

from openai import OpenAI


def extract_audio(input_path: str, output_path: str) -> bool:
    """Extract audio from video file."""
    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-vn",
        "-acodec", "mp3",
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
    Generate captions for a video file using OpenAI Whisper API.

    Args:
        input_path: Path to input video file
        output_dir: Directory to save caption files
        language: Language code (e.g., 'mn' for Mongolian, 'en' for English)
                  If None, Whisper will auto-detect
        model_size: Ignored (API uses whisper-1 model)

    Returns:
        Dictionary with paths to generated caption files
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "OPENAI_API_KEY environment variable not set"
        }

    client = OpenAI(api_key=api_key)
    os.makedirs(output_dir, exist_ok=True)

    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract audio as mp3 (smaller file size for API)
        audio_path = os.path.join(temp_dir, "audio.mp3")
        if not extract_audio(input_path, audio_path):
            return {
                "success": False,
                "error": "Failed to extract audio from video"
            }

        # Check file size (OpenAI limit is 25MB)
        file_size = os.path.getsize(audio_path)
        if file_size > 25 * 1024 * 1024:
            return {
                "success": False,
                "error": f"Audio file too large ({file_size / 1024 / 1024:.1f}MB). Max is 25MB."
            }

        print("Transcribing audio with OpenAI Whisper API...")

        # Transcribe using OpenAI API
        with open(audio_path, "rb") as audio_file:
            transcribe_options = {
                "model": "whisper-1",
                "file": audio_file,
                "response_format": "verbose_json",
                "timestamp_granularities": ["segment"]
            }

            if language:
                transcribe_options["language"] = language

            result = client.audio.transcriptions.create(**transcribe_options)

        # Convert response to dict
        result_dict = result.model_dump()
        detected_language = result_dict.get("language", "unknown")
        segments = result_dict.get("segments", [])
        full_text = result_dict.get("text", "")

        # Generate caption files
        base_name = Path(input_path).stem
        lang_suffix = language or detected_language

        srt_path = os.path.join(output_dir, f"{base_name}_{lang_suffix}.srt")
        vtt_path = os.path.join(output_dir, f"{base_name}_{lang_suffix}.vtt")
        json_path = os.path.join(output_dir, f"{base_name}_{lang_suffix}.json")

        # Generate SRT
        generate_srt(segments, srt_path)

        # Generate VTT
        generate_vtt(segments, vtt_path)

        # Save full transcript as JSON
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump({
                "language": detected_language,
                "text": full_text,
                "segments": segments
            }, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "language": detected_language,
            "srt_path": srt_path,
            "vtt_path": vtt_path,
            "json_path": json_path,
            "full_text": full_text,
            "segment_count": len(segments)
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
        model_size: Ignored (API uses whisper-1)

    Returns:
        Dictionary with paths to generated caption files
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "OPENAI_API_KEY environment variable not set"
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
    if detected_language == "mn" or detected_language == "mongolian":
        print("Generating English translation...")

        client = OpenAI(api_key=api_key)

        with tempfile.TemporaryDirectory() as temp_dir:
            audio_path = os.path.join(temp_dir, "audio.mp3")
            extract_audio(input_path, audio_path)

            # Use translation endpoint for English translation
            with open(audio_path, "rb") as audio_file:
                result = client.audio.translations.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"]
                )

            result_dict = result.model_dump()
            segments = result_dict.get("segments", [])

            base_name = Path(input_path).stem
            srt_path = os.path.join(output_dir, f"{base_name}_en_translated.srt")
            vtt_path = os.path.join(output_dir, f"{base_name}_en_translated.vtt")

            generate_srt(segments, srt_path)
            generate_vtt(segments, vtt_path)

            results["english_translation"] = {
                "success": True,
                "srt_path": srt_path,
                "vtt_path": vtt_path,
                "full_text": result_dict.get("text", ""),
                "segment_count": len(segments)
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
