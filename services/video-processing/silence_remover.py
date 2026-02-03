"""
Silence Remover using FFmpeg
Removes silent portions from video files
"""

import subprocess
import tempfile
import os
from pathlib import Path
from typing import List, Tuple


def detect_silence(
    input_path: str,
    noise_threshold: str = "-30dB",
    min_silence_duration: float = 0.5
) -> List[Tuple[float, float]]:
    """
    Detect silent portions in a video file.

    Args:
        input_path: Path to input video file
        noise_threshold: Audio level below which is considered silence (default: -30dB)
        min_silence_duration: Minimum duration of silence to detect in seconds

    Returns:
        List of tuples containing (start_time, end_time) of silent portions
    """
    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-af", f"silencedetect=noise={noise_threshold}:d={min_silence_duration}",
        "-f", "null",
        "-"
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )

    # Parse silence detection output from stderr
    silence_periods = []
    lines = result.stderr.split("\n")

    silence_start = None
    for line in lines:
        if "silence_start:" in line:
            parts = line.split("silence_start:")
            if len(parts) > 1:
                silence_start = float(parts[1].strip().split()[0])
        elif "silence_end:" in line and silence_start is not None:
            parts = line.split("silence_end:")
            if len(parts) > 1:
                silence_end = float(parts[1].strip().split()[0])
                silence_periods.append((silence_start, silence_end))
                silence_start = None

    return silence_periods


def get_video_duration(input_path: str) -> float:
    """Get the duration of a video file in seconds."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())


def remove_silence(
    input_path: str,
    output_path: str,
    noise_threshold: str = "-30dB",
    min_silence_duration: float = 0.5,
    padding: float = 0.1
) -> dict:
    """
    Remove silent portions from a video file.

    Args:
        input_path: Path to input video file
        output_path: Path to output video file
        noise_threshold: Audio level below which is considered silence
        min_silence_duration: Minimum duration of silence to remove
        padding: Keep this much silence at the edges (seconds)

    Returns:
        Dictionary with processing results
    """
    # Detect silence
    silence_periods = detect_silence(input_path, noise_threshold, min_silence_duration)

    if not silence_periods:
        # No silence detected, just copy the file
        subprocess.run(["cp", input_path, output_path])
        return {
            "success": True,
            "silence_removed": 0,
            "original_duration": get_video_duration(input_path),
            "new_duration": get_video_duration(input_path)
        }

    # Get video duration
    total_duration = get_video_duration(input_path)

    # Calculate non-silent segments
    non_silent_segments = []
    prev_end = 0

    for start, end in silence_periods:
        # Adjust for padding
        adjusted_start = max(0, start - padding)
        adjusted_end = min(total_duration, end + padding)

        if adjusted_start > prev_end:
            non_silent_segments.append((prev_end, adjusted_start))
        prev_end = adjusted_end

    # Add final segment
    if prev_end < total_duration:
        non_silent_segments.append((prev_end, total_duration))

    if not non_silent_segments:
        return {
            "success": False,
            "error": "No non-silent segments found"
        }

    # Create filter complex for concatenation
    with tempfile.TemporaryDirectory() as temp_dir:
        segment_files = []

        # Extract each non-silent segment
        for i, (start, end) in enumerate(non_silent_segments):
            segment_path = os.path.join(temp_dir, f"segment_{i}.mp4")
            cmd = [
                "ffmpeg",
                "-y",
                "-i", input_path,
                "-ss", str(start),
                "-t", str(end - start),
                "-c:v", "libx264",
                "-c:a", "aac",
                "-avoid_negative_ts", "make_zero",
                segment_path
            ]
            subprocess.run(cmd, capture_output=True)
            segment_files.append(segment_path)

        # Create concat file
        concat_file = os.path.join(temp_dir, "concat.txt")
        with open(concat_file, "w") as f:
            for segment_path in segment_files:
                f.write(f"file '{segment_path}'\n")

        # Concatenate segments
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file,
            "-c", "copy",
            output_path
        ]
        subprocess.run(cmd, capture_output=True)

    new_duration = get_video_duration(output_path)
    silence_removed = total_duration - new_duration

    return {
        "success": True,
        "silence_periods": len(silence_periods),
        "silence_removed": round(silence_removed, 2),
        "original_duration": round(total_duration, 2),
        "new_duration": round(new_duration, 2),
        "reduction_percent": round((silence_removed / total_duration) * 100, 1)
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python silence_remover.py <input_video> <output_video>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    result = remove_silence(input_file, output_file)
    print(f"Result: {result}")
