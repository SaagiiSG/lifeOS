"""
Transcription & Translation Module
- AssemblyAI for English transcription (raw API)
- Microsoft Translator for English → Mongolian translation
"""

import os
import json
from pathlib import Path
from typing import Optional


def format_timestamp_srt(milliseconds: int) -> str:
    """Convert milliseconds to SRT timestamp format (HH:MM:SS,mmm)."""
    seconds = milliseconds // 1000
    ms = milliseconds % 1000
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def generate_srt_content(words: list, max_chars_per_line: int = 42) -> str:
    """
    Generate SRT content from word-level timestamps.
    Groups words into readable caption segments.
    """
    if not words:
        return ""

    srt_lines = []
    segment_index = 1
    current_segment = []
    segment_start = None
    current_text = ""

    for word in words:
        word_text = word.text if hasattr(word, 'text') else word.get('text', '')
        word_start = word.start if hasattr(word, 'start') else word.get('start', 0)
        word_end = word.end if hasattr(word, 'end') else word.get('end', 0)

        # Start new segment
        if segment_start is None:
            segment_start = word_start

        # Check if adding this word exceeds line limit or creates segment > 5 seconds
        test_text = current_text + " " + word_text if current_text else word_text
        segment_duration = (word_end - segment_start) / 1000  # in seconds

        if len(test_text) > max_chars_per_line or segment_duration > 5:
            # Save current segment
            if current_text and current_segment:
                segment_end = current_segment[-1].end if hasattr(current_segment[-1], 'end') else current_segment[-1].get('end', 0)
                srt_lines.append(f"{segment_index}")
                srt_lines.append(f"{format_timestamp_srt(segment_start)} --> {format_timestamp_srt(segment_end)}")
                srt_lines.append(current_text.strip())
                srt_lines.append("")
                segment_index += 1

            # Start new segment with current word
            current_segment = [word]
            segment_start = word_start
            current_text = word_text
        else:
            current_segment.append(word)
            current_text = test_text

    # Don't forget the last segment
    if current_text and current_segment:
        segment_end = current_segment[-1].end if hasattr(current_segment[-1], 'end') else current_segment[-1].get('end', 0)
        srt_lines.append(f"{segment_index}")
        srt_lines.append(f"{format_timestamp_srt(segment_start)} --> {format_timestamp_srt(segment_end)}")
        srt_lines.append(current_text.strip())
        srt_lines.append("")

    return "\n".join(srt_lines)


def transcribe_video(video_path: str, output_dir: str) -> dict:
    """
    Transcribe video using AssemblyAI.

    Args:
        video_path: Path to video file
        output_dir: Directory to save SRT files

    Returns:
        Dictionary with transcription results
    """
    import requests
    import time

    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "ASSEMBLYAI_API_KEY environment variable not set"
        }

    os.makedirs(output_dir, exist_ok=True)

    headers = {
        "authorization": api_key,
        "content-type": "application/json"
    }

    try:
        print("Starting AssemblyAI transcription...")

        # Step 1: Upload the file
        print("Uploading file to AssemblyAI...")
        with open(video_path, "rb") as f:
            upload_response = requests.post(
                "https://api.assemblyai.com/v2/upload",
                headers={"authorization": api_key},
                data=f
            )

        if upload_response.status_code != 200:
            return {
                "success": False,
                "error": f"Upload failed: {upload_response.text}"
            }

        audio_url = upload_response.json()["upload_url"]
        print(f"File uploaded: {audio_url}")

        # Step 2: Request transcription
        print("Requesting transcription...")
        transcript_request = {
            "audio_url": audio_url,
            "language_code": "en",
            "speech_models": ["universal-2"]
        }

        transcript_response = requests.post(
            "https://api.assemblyai.com/v2/transcript",
            json=transcript_request,
            headers=headers
        )

        if transcript_response.status_code != 200:
            return {
                "success": False,
                "error": f"Transcription request failed: {transcript_response.text}"
            }

        transcript_id = transcript_response.json()["id"]
        print(f"Transcription started: {transcript_id}")

        # Step 3: Poll for completion
        polling_endpoint = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"

        while True:
            poll_response = requests.get(polling_endpoint, headers=headers)
            result = poll_response.json()

            if result["status"] == "completed":
                break
            elif result["status"] == "error":
                return {
                    "success": False,
                    "error": f"Transcription failed: {result.get('error', 'Unknown error')}"
                }

            print(f"Transcription status: {result['status']}")
            time.sleep(3)

        print("Transcription completed!")

        # Get word-level timestamps
        words = result.get("words", [])
        full_text = result.get("text", "")
        audio_duration = result.get("audio_duration", 0)

        # Generate SRT content
        srt_content = generate_srt_content(words)

        # Save English SRT
        base_name = Path(video_path).stem
        english_srt_path = os.path.join(output_dir, f"{base_name}_english.srt")

        with open(english_srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        # Save full transcript as JSON for B-roll matching
        transcript_json_path = os.path.join(output_dir, f"{base_name}_transcript.json")

        transcript_data = {
            "text": full_text,
            "words": words,
            "duration_ms": audio_duration * 1000 if audio_duration else 0
        }

        with open(transcript_json_path, "w", encoding="utf-8") as f:
            json.dump(transcript_data, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "english_srt_path": english_srt_path,
            "transcript_json_path": transcript_json_path,
            "full_text": full_text,
            "word_count": len(words),
            "duration_seconds": audio_duration
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def translate_to_mongolian(english_srt_path: str, output_dir: str) -> dict:
    """
    Translate English SRT to Mongolian using Microsoft Translator.

    Args:
        english_srt_path: Path to English SRT file
        output_dir: Directory to save Mongolian SRT

    Returns:
        Dictionary with translation results
    """
    api_key = os.getenv("AZURE_TRANSLATOR_KEY")
    region = os.getenv("AZURE_TRANSLATOR_REGION", "eastus")

    if not api_key:
        return {
            "success": False,
            "error": "AZURE_TRANSLATOR_KEY environment variable not set"
        }

    try:
        from azure.ai.translation.text import TextTranslationClient
        from azure.core.credentials import AzureKeyCredential

        # Read English SRT
        with open(english_srt_path, "r", encoding="utf-8") as f:
            english_srt = f.read()

        # Parse SRT to extract text segments
        lines = english_srt.strip().split("\n")
        segments = []
        i = 0

        while i < len(lines):
            if lines[i].strip().isdigit():
                segment_num = lines[i].strip()
                timestamp = lines[i + 1].strip() if i + 1 < len(lines) else ""
                text = lines[i + 2].strip() if i + 2 < len(lines) else ""
                segments.append({
                    "num": segment_num,
                    "timestamp": timestamp,
                    "text": text
                })
                i += 4  # Skip to next segment (num, timestamp, text, blank line)
            else:
                i += 1

        if not segments:
            return {
                "success": False,
                "error": "No segments found in SRT file"
            }

        # Initialize translator client
        credential = AzureKeyCredential(api_key)
        client = TextTranslationClient(
            credential=credential,
            region=region
        )

        # Translate each segment
        texts_to_translate = [s["text"] for s in segments if s["text"]]

        print(f"Translating {len(texts_to_translate)} segments to Mongolian...")

        # Batch translate
        response = client.translate(
            body=texts_to_translate,
            to_language=["mn"],  # Mongolian
            from_language="en"
        )

        # Build Mongolian SRT
        mongolian_srt_lines = []
        translation_idx = 0

        for segment in segments:
            if segment["text"]:
                translated_text = response[translation_idx].translations[0].text
                translation_idx += 1
            else:
                translated_text = ""

            mongolian_srt_lines.append(segment["num"])
            mongolian_srt_lines.append(segment["timestamp"])
            mongolian_srt_lines.append(translated_text)
            mongolian_srt_lines.append("")

        # Save Mongolian SRT
        base_name = Path(english_srt_path).stem.replace("_english", "")
        mongolian_srt_path = os.path.join(output_dir, f"{base_name}_mongolian.srt")

        with open(mongolian_srt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(mongolian_srt_lines))

        return {
            "success": True,
            "mongolian_srt_path": mongolian_srt_path,
            "segments_translated": len(texts_to_translate)
        }

    except ImportError:
        return {
            "success": False,
            "error": "azure-ai-translation-text not installed. Run: pip install azure-ai-translation-text"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def generate_captions(video_path: str, output_dir: str) -> dict:
    """
    Full caption generation pipeline:
    1. Transcribe with AssemblyAI (English)
    2. Translate with Microsoft Translator (Mongolian)

    Returns both SRT files.
    """
    os.makedirs(output_dir, exist_ok=True)

    # Step 1: Transcribe to English
    print("Step 1: Transcribing with AssemblyAI...")
    transcription_result = transcribe_video(video_path, output_dir)

    if not transcription_result.get("success"):
        return transcription_result

    # Step 2: Translate to Mongolian
    print("Step 2: Translating to Mongolian...")
    translation_result = translate_to_mongolian(
        transcription_result["english_srt_path"],
        output_dir
    )

    if not translation_result.get("success"):
        # Return partial success with just English
        return {
            "success": True,
            "partial": True,
            "english_srt_path": transcription_result["english_srt_path"],
            "transcript_json_path": transcription_result["transcript_json_path"],
            "full_text": transcription_result["full_text"],
            "mongolian_error": translation_result.get("error"),
            "word_count": transcription_result["word_count"],
            "duration_seconds": transcription_result["duration_seconds"]
        }

    return {
        "success": True,
        "english_srt_path": transcription_result["english_srt_path"],
        "mongolian_srt_path": translation_result["mongolian_srt_path"],
        "transcript_json_path": transcription_result["transcript_json_path"],
        "full_text": transcription_result["full_text"],
        "word_count": transcription_result["word_count"],
        "duration_seconds": transcription_result["duration_seconds"],
        "segments_translated": translation_result["segments_translated"]
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python transcription.py <video_path> <output_dir>")
        sys.exit(1)

    video_file = sys.argv[1]
    output_directory = sys.argv[2]

    result = generate_captions(video_file, output_directory)
    print(f"Result: {json.dumps(result, indent=2)}")
