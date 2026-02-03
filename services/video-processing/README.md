# LifeOS Video Processing Service

Backend service for processing videos with silence removal and caption generation.

## Features

- **Silence Removal**: Automatically detects and removes silent portions from videos
- **Caption Generation**: Uses OpenAI Whisper for multilingual transcription
  - Supports Mongolian (mn) and English (en)
  - Auto-language detection
  - Generates SRT and WebVTT subtitle files

## Local Development

### Prerequisites

- Python 3.11+
- FFmpeg installed (`brew install ffmpeg` on macOS)

### Setup

```bash
cd services/video-processing

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

Server runs at http://localhost:8000

### API Endpoints

- `GET /health` - Health check
- `POST /process` - Start video processing
- `GET /status/{job_id}` - Check processing status

### Example Usage

```bash
# Start processing
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://example.com/video.mp4",
    "shape_id": "shape:abc123",
    "options": {
      "noise_threshold": "-30dB",
      "min_silence_duration": 0.5,
      "whisper_model": "base"
    }
  }'

# Check status
curl http://localhost:8000/status/{job_id}
```

## Deployment

### Railway

1. Connect your GitHub repo to Railway
2. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy!

### Render

1. Create a new Web Service
2. Connect your repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

### Docker

```bash
# Build
docker build -t lifeos-video-processor .

# Run
docker run -p 8000:8000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  lifeos-video-processor
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for server-side operations) |
| `TEMP_DIR` | Temporary directory for processing (default: `/tmp/video-processing`) |

## Whisper Models

Available model sizes (trade-off between speed and accuracy):

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | 39M | Fastest | Good |
| base | 74M | Fast | Better |
| small | 244M | Medium | Good |
| medium | 769M | Slow | Great |
| large | 1550M | Slowest | Best |

For Mongolian transcription, `small` or `medium` is recommended for better accuracy.
