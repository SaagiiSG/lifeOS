"""
Video Exporter with B-Roll Integration
Renders final video with B-roll overlays and burned-in captions using FFmpeg
"""

import subprocess
import tempfile
import os
from pathlib import Path
from typing import Optional


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


def get_video_resolution(input_path: str) -> tuple[int, int]:
    """Get video width and height."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=s=x:p=0",
        input_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    parts = result.stdout.strip().split("x")
    return int(parts[0]), int(parts[1])


def escape_ass_text(text: str) -> str:
    """Escape special characters for ASS subtitle format."""
    text = text.replace("\\", "\\\\")
    text = text.replace("{", "\\{")
    text = text.replace("}", "\\}")
    text = text.replace("\n", "\\N")
    return text


def format_ass_time(seconds: float) -> str:
    """Format seconds to ASS timestamp (H:MM:SS.cc)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def generate_ass_file(
    output_path: str,
    english_captions: list[dict],
    mongolian_captions: list[dict],
    video_width: int,
    video_height: int,
    english_y: float = 75.0,
    mongolian_y: float = 5.0,
    show_shadow: bool = True,
) -> str:
    """
    Generate an ASS subtitle file with dual caption styling.

    Args:
        output_path: Path to write ASS file
        english_captions: [{start, end, text}]
        mongolian_captions: [{start, end, text}]
        video_width: Video width in pixels
        video_height: Video height in pixels
        english_y: English caption Y position as percentage from top
        mongolian_y: Mongolian caption Y position as percentage from top
        show_shadow: Whether to show text shadow

    Returns:
        Path to the generated ASS file
    """
    # Calculate margin positions from percentages
    # ASS uses MarginV as distance from bottom for bottom-aligned text
    # and from top for top-aligned text
    english_margin_top = int(video_height * english_y / 100)
    mongolian_margin_top = int(video_height * mongolian_y / 100)

    shadow_depth = 3 if show_shadow else 0
    outline_size = 2 if show_shadow else 1

    # English style: white, bold, text shadow, outline
    # Mongolian style: yellow (#FFD700 -> &H00D7FF& in ASS BGR), smaller, normal weight
    # ASS color format: &HBBGGRR& (BGR, not RGB)
    ass_content = f"""[Script Info]
Title: LifeOS Video Captions
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: English,Arial,{int(video_height * 0.035)},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,{outline_size},{shadow_depth},2,20,20,{video_height - english_margin_top},1
Style: Mongolian,Arial,{int(video_height * 0.025)},&H0000D7FF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,{outline_size},{shadow_depth},8,20,20,{mongolian_margin_top},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    # Add English captions
    for caption in english_captions:
        start = format_ass_time(caption["start"])
        end = format_ass_time(caption["end"])
        text = escape_ass_text(caption["text"])
        ass_content += f"Dialogue: 0,{start},{end},English,,0,0,0,,{text}\n"

    # Add Mongolian captions
    for caption in mongolian_captions:
        start = format_ass_time(caption["start"])
        end = format_ass_time(caption["end"])
        text = escape_ass_text(caption["text"])
        ass_content += f"Dialogue: 0,{start},{end},Mongolian,,0,0,0,,{text}\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

    return output_path


def export_video(
    main_video_path: str,
    output_path: str,
    broll_overlays: list[dict],
    english_captions: list[dict],
    mongolian_captions: list[dict],
    caption_settings: dict,
    export_settings: dict,
    on_progress: Optional[callable] = None,
    bg_music_path: Optional[str] = None,
    volume_settings: Optional[dict] = None,
) -> dict:
    """
    Export final video with B-roll overlays, burned-in captions, and optional background music.

    Args:
        main_video_path: Path to the main video file
        output_path: Path for the output video
        broll_overlays: [{start, end, clip_file_path}] - B-roll overlay definitions
        english_captions: [{start, end, text}] - English caption data
        mongolian_captions: [{start, end, text}] - Mongolian caption data
        caption_settings: {english_y, mongolian_y, show_shadow, burn_captions}
        export_settings: {resolution, format}
        on_progress: Optional callback for progress updates
        bg_music_path: Optional path to background music file
        volume_settings: Optional {main_volume: 0-1, bg_music_volume: 0-1}

    Returns:
        Dictionary with export results
    """
    try:
        # Get source video info
        src_width, src_height = get_video_resolution(main_video_path)
        total_duration = get_video_duration(main_video_path)

        # Determine output resolution
        resolution = export_settings.get("resolution", "source")
        if resolution == "1080":
            out_width, out_height = 1080, 1920
        elif resolution == "4k":
            out_width, out_height = 2160, 3840
        else:
            out_width, out_height = src_width, src_height

        # Ensure 9:16 aspect ratio
        if out_width / out_height > 9 / 16:
            out_width = int(out_height * 9 / 16)
        elif out_width / out_height < 9 / 16:
            out_height = int(out_width * 16 / 9)

        # Ensure even dimensions (required by H.264)
        out_width = out_width + (out_width % 2)
        out_height = out_height + (out_height % 2)

        if on_progress:
            on_progress(10, "Preparing segments...")

        with tempfile.TemporaryDirectory() as temp_dir:
            # Sort overlays by start time
            sorted_overlays = sorted(broll_overlays, key=lambda o: o["start"])

            # Build timeline segments: each is either main video or B-roll
            segments = []
            current_time = 0.0

            for overlay in sorted_overlays:
                broll_start = overlay["start"]
                broll_end = overlay["end"]
                clip_path = overlay["clip_file_path"]

                # Validate B-roll file exists
                if not os.path.exists(clip_path):
                    print(f"B-roll file not found, skipping: {clip_path}")
                    continue

                # Main video segment before this B-roll
                if broll_start > current_time:
                    segments.append({
                        "type": "main",
                        "start": current_time,
                        "end": broll_start,
                    })

                # B-roll segment
                segments.append({
                    "type": "broll",
                    "start": broll_start,
                    "end": broll_end,
                    "clip_path": clip_path,
                })

                current_time = broll_end

            # Final main video segment after last B-roll
            if current_time < total_duration:
                segments.append({
                    "type": "main",
                    "start": current_time,
                    "end": total_duration,
                })

            # If no segments were created (no valid overlays), use entire main video
            if not segments:
                segments = [{"type": "main", "start": 0, "end": total_duration}]

            if on_progress:
                on_progress(20, f"Processing {len(segments)} segments...")

            # Extract/encode each segment
            segment_files = []
            scale_filter = f"scale={out_width}:{out_height}:force_original_aspect_ratio=decrease,pad={out_width}:{out_height}:(ow-iw)/2:(oh-ih)/2:black"

            for i, seg in enumerate(segments):
                segment_path = os.path.join(temp_dir, f"segment_{i:04d}.mp4")
                seg_duration = seg["end"] - seg["start"]

                if seg["type"] == "main":
                    # Extract main video segment (with audio)
                    cmd = [
                        "ffmpeg", "-y",
                        "-ss", str(seg["start"]),
                        "-i", main_video_path,
                        "-t", str(seg_duration),
                        "-vf", scale_filter,
                        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                        "-c:a", "aac", "-b:a", "128k",
                        "-avoid_negative_ts", "make_zero",
                        "-r", "30",
                        segment_path,
                    ]
                else:
                    # B-roll segment: use B-roll video, but keep main video audio
                    broll_clip = seg["clip_path"]
                    broll_scale = f"scale={out_width}:{out_height}:force_original_aspect_ratio=increase,crop={out_width}:{out_height}"

                    cmd = [
                        "ffmpeg", "-y",
                        "-ss", str(seg["start"]),
                        "-i", main_video_path,          # Input 0: main video (for audio)
                        "-i", broll_clip,                # Input 1: B-roll video
                        "-t", str(seg_duration),
                        "-filter_complex",
                        f"[1:v]trim=0:{seg_duration},setpts=PTS-STARTPTS,{broll_scale}[broll]",
                        "-map", "[broll]",               # Use B-roll video
                        "-map", "0:a?",                  # Use main video audio
                        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                        "-c:a", "aac", "-b:a", "128k",
                        "-shortest",
                        "-avoid_negative_ts", "make_zero",
                        "-r", "30",
                        segment_path,
                    ]

                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    print(f"FFmpeg error for segment {i}: {result.stderr[-500:]}")
                    # Fall back to main video for this segment
                    if seg["type"] == "broll":
                        fallback_cmd = [
                            "ffmpeg", "-y",
                            "-ss", str(seg["start"]),
                            "-i", main_video_path,
                            "-t", str(seg_duration),
                            "-vf", scale_filter,
                            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                            "-c:a", "aac", "-b:a", "128k",
                            "-avoid_negative_ts", "make_zero",
                            "-r", "30",
                            segment_path,
                        ]
                        subprocess.run(fallback_cmd, capture_output=True, text=True)

                if os.path.exists(segment_path):
                    segment_files.append(segment_path)

                if on_progress:
                    progress = 20 + int(50 * (i + 1) / len(segments))
                    on_progress(progress, f"Processed segment {i + 1}/{len(segments)}")

            if not segment_files:
                return {"success": False, "error": "No segments were generated"}

            # Concatenate all segments
            concat_path = os.path.join(temp_dir, "concat_no_captions.mp4")
            concat_file = os.path.join(temp_dir, "concat.txt")

            with open(concat_file, "w") as f:
                for seg_path in segment_files:
                    f.write(f"file '{seg_path}'\n")

            concat_cmd = [
                "ffmpeg", "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_file,
                "-c", "copy",
                concat_path,
            ]
            subprocess.run(concat_cmd, capture_output=True, text=True)

            if not os.path.exists(concat_path):
                return {"success": False, "error": "Failed to concatenate segments"}

            if on_progress:
                on_progress(75, "Adding captions...")

            # Burn in captions if requested
            burn_captions = caption_settings.get("burn_captions", True)
            video_before_music = os.path.join(temp_dir, "before_music.mp4")
            if burn_captions and (english_captions or mongolian_captions):
                ass_path = os.path.join(temp_dir, "captions.ass")
                generate_ass_file(
                    ass_path,
                    english_captions,
                    mongolian_captions,
                    out_width,
                    out_height,
                    english_y=caption_settings.get("english_y", 75),
                    mongolian_y=caption_settings.get("mongolian_y", 5),
                    show_shadow=caption_settings.get("show_shadow", True),
                )

                # Apply captions to concatenated video
                # Escape the ASS path for FFmpeg filter (colons and backslashes)
                escaped_ass = ass_path.replace("\\", "/").replace(":", "\\:")
                caption_cmd = [
                    "ffmpeg", "-y",
                    "-i", concat_path,
                    "-vf", f"ass='{escaped_ass}'",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                    "-c:a", "copy",
                    video_before_music,
                ]
                result = subprocess.run(caption_cmd, capture_output=True, text=True)

                if result.returncode != 0:
                    print(f"Caption burn-in failed: {result.stderr[-500:]}")
                    # Fall back to video without captions
                    subprocess.run(["cp", concat_path, video_before_music])
            else:
                # No caption burn-in, just copy
                subprocess.run(["cp", concat_path, video_before_music])

            # Mix in background music if provided
            if bg_music_path and os.path.exists(bg_music_path):
                if on_progress:
                    on_progress(85, "Mixing background music...")

                main_vol = (volume_settings or {}).get("main_volume", 1.0)
                bg_vol = (volume_settings or {}).get("bg_music_volume", 0.3)

                music_cmd = [
                    "ffmpeg", "-y",
                    "-i", video_before_music,
                    "-stream_loop", "-1",
                    "-i", bg_music_path,
                    "-filter_complex",
                    f"[0:a]volume={main_vol}[a0];[1:a]volume={bg_vol}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]",
                    "-map", "0:v",
                    "-map", "[aout]",
                    "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k",
                    "-shortest",
                    output_path,
                ]
                result = subprocess.run(music_cmd, capture_output=True, text=True)

                if result.returncode != 0:
                    print(f"BG music mixing failed: {result.stderr[-500:]}")
                    # Fall back to video without music
                    subprocess.run(["cp", video_before_music, output_path])
            else:
                subprocess.run(["cp", video_before_music, output_path])

        if not os.path.exists(output_path):
            return {"success": False, "error": "Export failed - output file not created"}

        if on_progress:
            on_progress(95, "Finalizing...")

        final_duration = get_video_duration(output_path)
        final_width, final_height = get_video_resolution(output_path)
        file_size = os.path.getsize(output_path)

        return {
            "success": True,
            "output_path": output_path,
            "duration": round(final_duration, 2),
            "resolution": f"{final_width}x{final_height}",
            "file_size": file_size,
            "file_size_mb": round(file_size / (1024 * 1024), 1),
            "segments_count": len(segments),
            "broll_count": len([s for s in segments if s["type"] == "broll"]),
            "captions_burned": burn_captions and (len(english_captions) > 0 or len(mongolian_captions) > 0),
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 3:
        print("Usage: python video_exporter.py <input_video> <output_video> [overlays.json]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    overlays = []
    if len(sys.argv) > 3:
        with open(sys.argv[3]) as f:
            overlays = json.load(f)

    result = export_video(
        input_file,
        output_file,
        broll_overlays=overlays,
        english_captions=[],
        mongolian_captions=[],
        caption_settings={"burn_captions": False},
        export_settings={"resolution": "source"},
        on_progress=lambda p, m: print(f"[{p}%] {m}"),
    )
    print(f"Result: {json.dumps(result, indent=2)}")
