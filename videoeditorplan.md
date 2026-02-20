BUILD: Caption Generation with Microsoft Translator, B-roll Auto-Overlay System, and Inline Video Editor
CURRENT STATE:

Video upload to Supabase Storage is working
Python silence removal pipeline needs caption + B-roll integration
Local Whisper is failing (Python version issues)

PART 1: CAPTION GENERATION WITH MICROSOFT TRANSLATOR
Setup Microsoft Translator Integration:

Guide me through Microsoft Azure signup and Translator API key setup
Install Microsoft Translator Python SDK in the video processing service
Create caption generation script that:

Takes processed video (after silence removal)
Sends to AssemblyAI for English transcription
Uses Microsoft Translator API to translate English captions to Mongolian
Generates TWO caption tracks:
a) English captions (original transcription)
b) Mongolian captions (translated from English)
Outputs two separate SRT files: english.srt and mongolian.srt
Returns both SRT files to frontend



Caption Specifications:

Soft subtitles (toggleable, not burned into video)
Video format: Vertical 9:16 (Instagram Reels format)
English caption styling:

Position: bottom third of screen
Font: Instagram native font (Avenir Next or similar sans-serif)
Size: standard readable size (16-18px)
Color: white (#FFFFFF) with black outline/shadow for readability
Background: semi-transparent black bar behind text


Mongolian caption styling:

Position: top of screen (24px from top edge)
Font: Instagram native font (Avenir Next or similar sans-serif)
Size: smaller than English (70% of English caption size, approximately 11-13px)
Color: yellowish (#FFD700 or #FFC107)
Background: semi-transparent black bar behind text



Caption Editing:

User should be able to edit generated captions
Edit caption text, timing (start/end time), and delete caption segments
Save edited captions back to database
Re-export video with edited captions

Technical Implementation:

Python script calls AssemblyAI API with transcription-only feature (no speaker detection, no auto-chapters, no content moderation)
After English transcription, call Microsoft Translator API to convert to Mongolian
Store SRT files in Supabase Storage alongside video
Frontend displays captions overlay on video player
Caption editor component with timeline showing all caption segments

PART 2: B-ROLL AUTO-OVERLAY SYSTEM
B-roll Setup Requirements:

External SSD mount point detection
SSD path configuration in app settings
B-roll folder structure on SSD:

/mnt/ssd/broll/timelapse/
/mnt/ssd/broll/medium/
/mnt/ssd/broll/wide-shot/
/mnt/ssd/broll/close-up/
/mnt/ssd/broll/random/
/mnt/ssd/broll/walking-selfie/
Or flat structure: /mnt/ssd/broll/ (all files in one folder)



SSD Connection Check:

On app load and when opening Video Editor, check if SSD is connected
If SSD not found at configured path, show warning modal:

"External SSD not detected. Connect SSD to proceed with B-roll overlay."
"Continue without B-roll" button (disables B-roll feature)
"Retry" button (checks connection again)


If SSD connected, scan and index all video files in B-roll folder(s)

B-roll Auto-Overlay Logic:

AI analyzes English transcript from AssemblyAI
For every 3-5 seconds of speech, AI determines relevant B-roll:

Extract keywords from transcript segment (e.g., "equations", "graphs", "studying")
Match keywords to B-roll categories or filenames
If no match, use "random" category B-roll


AI generates overlay timeline with B-roll suggestions:

Time range: 00:05 - 00:10 → broll/close-up/pen-writing.mp4
Time range: 00:11 - 00:15 → broll/medium/student-studying.mp4
Continuous coverage (no gaps in B-roll)


B-roll overlays are full-screen replacement (covers main video completely)
User sees timeline with B-roll clips placed automatically
User can delete individual B-roll overlays if not needed
User can manually add/replace B-roll clips from gallery

B-roll Transition Style:

Cut directly (no fade, instant transition)
Full screen replacement (B-roll covers main video 100%)
B-roll maintains 9:16 aspect ratio
If B-roll is different aspect ratio, scale and crop to fit 9:16

B-roll Gallery/Browser:

Panel in editor showing all available B-roll clips
Organized by folder categories (timelapse, medium, wide-shot, etc.)
Thumbnail previews for each clip
Drag and drop to add B-roll to timeline manually
Search/filter by filename or category

AI B-roll Matching Logic:
Use GPT-4 or Claude API to analyze transcript and suggest B-roll:

Input: English transcript segment (3-5 seconds of speech)
Input: List of available B-roll filenames and categories
Output: Best matching B-roll clip for that segment
Fallback: If no good match, use "random" category

Example AI Prompt for B-roll Matching:
"Analyze this transcript: 'Let's solve this quadratic equation step by step'
Available B-roll categories: timelapse, medium, wide-shot, close-up, random, walking-selfie
Available files in close-up: pen-writing.mp4, hand-calculator.mp4, notebook-solving.mp4
Suggest the best B-roll clip and category for this 5-second segment."
PART 3: INLINE VIDEO EDITOR
Editor Requirements:

Large node on canvas (Video Editor Node) that opens full editor modal when clicked
Timeline interface similar to CapCut:

Main video track (your talking head footage)
B-roll overlay track (above main video)
Audio waveform visualization
Caption tracks (English and Mongolian)
Playhead scrubber
Zoom in/out on timeline



Editing Tools:

Cut/Trim clips:

Click on timeline to set cut point
Split video at playhead position
Delete selected segments (main video or B-roll)
Trim start/end of video or clips


Reorder clips:

Drag and drop clips on timeline to reorder
Visual indicators showing clip order


Split into segments:

Split video at any point
Each segment becomes independent clip
Clips remain connected on timeline


B-roll Management:

Delete auto-generated B-roll overlays
Add new B-roll from gallery (drag & drop)
Replace existing B-roll
Adjust B-roll duration (trim start/end)
Move B-roll to different time position



Undo System:

Undo button that reverses last action
Undo stack stores up to 20 previous states
Keyboard shortcut: Cmd+Z (Mac) / Ctrl+Z (Windows)
Redo button and Cmd+Shift+Z / Ctrl+Shift+Z

Non-destructive editing:

Original video file never modified
B-roll files never modified
All edits stored as metadata (cut points, ordering, B-roll placements)
Export renders new video based on edit decisions

Timeline Interface Features:

Play/pause controls
Frame-by-frame navigation (left/right arrow keys)
Thumbnail previews every 1 second on timeline
Current time display and total duration
Zoom slider for timeline (show more/less frames)
Snap to grid for precise cuts
Multi-track view:

Track 1: Main video (your footage)
Track 2: B-roll overlays (full screen replacements)
Track 3: Audio waveform
Track 4: English captions
Track 5: Mongolian captions



Export Settings:

Resolution: 4K (3840x2160) if source is 4K, otherwise 1080p (1920x1080)
Aspect ratio: 9:16 (vertical, Instagram Reels format)
Format: MP4 (H.264 codec) - Instagram Reels compatible
Frame rate: maintain source frame rate (typically 30fps or 60fps)
Include captions: option to burn in captions (hardcoded) or export with soft subtitles
Export quality: High bitrate (suitable for Instagram Reels)
Export progress indicator with estimated time remaining

Video Player with Captions and B-roll Preview:

Use Video.js or React Player
Display both English and Mongolian captions simultaneously
Show B-roll overlays in real-time during playback
Caption toggle buttons (show/hide each language independently)
Captions positioned correctly (English bottom third, Mongolian top 24px)
Captions styled per specifications above
Playback speed controls (0.5x, 1x, 1.5x, 2x)
B-roll preview: when B-roll is active, show full screen B-roll with captions on top

Editor UI Layout:

Top bar: Toolbar (cut, split, undo, redo, B-roll gallery, export buttons)
Left sidebar: B-roll gallery browser (organized by category, searchable)
Center: Video preview with dual captions overlay and B-roll preview
Bottom: Multi-track timeline (main video, B-roll, audio, captions)
Right sidebar:

Caption editor panel (tabbed: English / Mongolian)
Export settings panel
SSD status indicator



Workflow:

User uploads raw video (max 1:40, typically 2min)
Silence removal processing
Send to AssemblyAI → generates English transcript
Translate to Mongolian via Microsoft Translator
AI analyzes transcript and auto-generates B-roll overlay timeline:

Scans SSD for available B-roll clips
Matches transcript keywords to B-roll categories/filenames
Places B-roll clips continuously throughout video


Video Editor Node shows "Ready to edit" with thumbnail
User clicks node → opens full-screen editor modal
User sees:

Video with captions in preview
Timeline with main video + B-roll overlays already placed
B-roll gallery on left sidebar


User reviews AI-placed B-roll:

Delete unwanted B-roll overlays
Drag new B-roll from gallery to replace/add


User cuts/trims main video (goal: reduce 2min to 30-40sec)
User edits caption text/timing if translation errors exist
User clicks "Export" → renders final video:

30-40sec duration
9:16 vertical format
B-roll overlays integrated
Dual captions (English + Mongolian)


Exported video saved to Supabase Storage
Download link provided to user

Video Processing Performance Optimization:

Max video length: 1:40 (100 seconds)
Typical workflow: 2min raw → 30-40sec final
Optimize for fast processing:

AssemblyAI transcription: ~1-2min for 2min video
Microsoft Translator: ~10-20sec
Silence removal: ~30-60sec
AI B-roll matching: ~20-30sec
Video export with B-roll (30-40sec final): ~1-2min
Total pipeline: ~4-6min end-to-end



Database Updates Needed:
Add to video_projects table:

caption_english_path text (SRT file path)
caption_mongolian_path text (SRT file path)
transcript text (full English transcript for AI B-roll matching)
edit_metadata jsonb (JSON storing cut points, clip order, segments)
broll_overlay_metadata jsonb (JSON storing B-roll placements, timings, file paths)
export_settings jsonb (JSON storing resolution, format, quality, caption burn-in)
exported_video_path text (final rendered video path)
video_duration_original integer (seconds)
video_duration_final integer (seconds)
ssd_path text (external SSD mount point path)

Add new table broll_clips:

id uuid primary key
file_path text (path to B-roll video on SSD)
category text (timelapse, medium, wide-shot, close-up, random, walking-selfie)
duration integer (seconds)
thumbnail_path text (generated thumbnail for gallery)
keywords text[] (array of keywords for AI matching)
created_at timestamp

Python Processing Pipeline:
CURRENT: Upload → Remove Silence → Return processed video
NEW:

Upload raw video
Remove silence (FFmpeg)
Send to AssemblyAI for English transcription
Translate English to Mongolian (Microsoft Translator API)
Generate SRT files (english.srt, mongolian.srt)
Check if SSD is connected at configured path
If SSD connected:

Scan SSD for B-roll clips (index all video files)
Store B-roll metadata in database (file paths, categories)


AI analyzes transcript and generates B-roll overlay timeline:

Use GPT-4 or Claude API
Input: transcript segments + available B-roll list
Output: JSON with B-roll placements (time ranges, file paths)


Return: processed video + english.srt + mongolian.srt + broll_overlay_timeline.json

Frontend Components to Build:

VideoEditorNode.tsx - Large canvas node that opens editor
VideoEditorModal.tsx - Full-screen editor interface
VideoTimeline.tsx - Multi-track timeline (main video, B-roll, captions)
VideoPlayer.tsx - Player with dual caption support and B-roll preview
BrollGallery.tsx - Left sidebar with B-roll clips organized by category
BrollOverlayTrack.tsx - Timeline track showing B-roll overlays
CaptionEditor.tsx - Edit caption text and timing (tabbed: English/Mongolian)
ExportPanel.tsx - Export settings and progress
UndoRedoControls.tsx - Undo/redo buttons with keyboard shortcuts
SsdStatusIndicator.tsx - Shows SSD connection status, retry button

Build Order:

FIRST: Set up AssemblyAI, get API key, generate English captions
SECOND: Set up Microsoft Translator, translate English → Mongolian
THIRD: Build video player with dual caption display (9:16 format, test positioning)
FOURTH: Build caption editing interface
FIFTH: Build SSD detection and B-roll indexing system
SIXTH: Build B-roll gallery browser (left sidebar, categorized)
SEVENTH: Build AI B-roll matching logic (analyze transcript, suggest B-roll)
EIGHTH: Build multi-track timeline with B-roll overlay track
NINTH: Build B-roll management (delete, add, replace, move)
TENTH: Add undo/redo system
ELEVENTH: Build export with B-roll integration (render final video)

Test After Each Step:

After Step 1: Upload 2min video → see English SRT file
After Step 2: English SRT translated to Mongolian SRT
After Step 3: Video plays in 9:16 format with dual captions (English bottom, Mongolian top yellow)
After Step 4: Can edit caption text and save
After Step 5: App detects SSD, indexes B-roll clips, shows count
After Step 6: B-roll gallery shows all clips with thumbnails, organized by category
After Step 7: AI analyzes "Let's solve equations" → suggests close-up/pen-writing.mp4
After Step 8: Timeline shows main video + B-roll overlays auto-placed
After Step 9: Can delete B-roll overlay, drag new one from gallery
After Step 10: Undo removes B-roll, redo restores it
After Step 11: Export 40sec video with B-roll overlays + captions

START WITH:

AssemblyAI setup - guide me through account creation and API key
Microsoft Translator setup - guide me through Azure account and API key
Test with sample 30sec video - generate English + Mongolian captions
Show me captions working in 9:16 format before building B-roll system

IMPORTANT NOTES:

Video content: English (SAT math teaching)
Target audience: Mongolian speakers
Format: 9:16 vertical (Instagram Reels)
B-roll: External SSD always connected during editing
B-roll overlay: Full screen replacement, continuous coverage
Caption accuracy critical for educational content
Fast processing: under 6min total
SSD warning if not connected

CRITICAL FEATURES:

Dual captions (English + Mongolian) with correct positioning and styling
AI auto-places B-roll based on transcript analysis
User can delete/replace AI-placed B-roll
Multi-track timeline (main video, B-roll, captions)
Export 9:16 vertical video with integrated B-roll and captions


Ready to start! No more questions needed.