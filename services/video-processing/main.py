"""
Video Processing API Server
Handles video processing requests from LifeOS

Endpoints:
- POST /process: Start video processing
- GET /status/{job_id}: Check processing status
- GET /health: Health check

Deploy this to Railway, Render, or any Python hosting service.
"""

import os
import uuid
import asyncio
from typing import Optional
from datetime import datetime
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import aiofiles

from silence_remover import remove_silence
from caption_generator import generate_bilingual_captions

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
TEMP_DIR = os.getenv("TEMP_DIR", "/tmp/video-processing")


# Models
class ProcessRequest(BaseModel):
    video_url: str
    shape_id: str
    options: dict = {}


class ProcessResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, downloading, removing_silence, generating_captions, uploading, completed, failed
    progress: int
    message: str
    result: Optional[dict] = None


# In-memory job storage (use Redis in production)
jobs: dict[str, JobStatus] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(TEMP_DIR, exist_ok=True)
    yield
    # Shutdown
    pass


app = FastAPI(
    title="LifeOS Video Processor",
    description="Video processing backend for LifeOS",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def update_supabase_status(shape_id: str, status: str, data: dict = None):
    """Update video project status in Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return

    async with httpx.AsyncClient() as client:
        try:
            update_data = {"status": status}
            if data:
                update_data.update(data)

            await client.patch(
                f"{SUPABASE_URL}/rest/v1/video_projects",
                params={"shape_id": f"eq.{shape_id}"},
                json=update_data,
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                }
            )
        except Exception as e:
            print(f"Failed to update Supabase: {e}")


async def download_video(url: str, output_path: str) -> bool:
    """Download video from URL."""
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                async with aiofiles.open(output_path, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        await f.write(chunk)
            return True
        except Exception as e:
            print(f"Download failed: {e}")
            return False


async def upload_to_supabase(file_path: str, bucket: str = "videos") -> Optional[str]:
    """Upload file to Supabase Storage."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None

    filename = f"processed/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{Path(file_path).name}"

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            async with aiofiles.open(file_path, "rb") as f:
                content = await f.read()

            response = await client.post(
                f"{SUPABASE_URL}/storage/v1/object/{bucket}/{filename}",
                content=content,
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "video/mp4"
                }
            )
            response.raise_for_status()

            # Return public URL
            return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"
        except Exception as e:
            print(f"Upload failed: {e}")
            return None


async def process_video_task(job_id: str, video_url: str, shape_id: str, options: dict):
    """Background task to process video."""
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    try:
        # Update status: downloading
        jobs[job_id] = JobStatus(
            job_id=job_id,
            status="downloading",
            progress=10,
            message="Downloading video..."
        )
        await update_supabase_status(shape_id, "processing")

        # Download video
        input_path = os.path.join(job_dir, "input.mp4")
        if not await download_video(video_url, input_path):
            raise Exception("Failed to download video")

        # Update status: removing silence
        jobs[job_id].status = "removing_silence"
        jobs[job_id].progress = 30
        jobs[job_id].message = "Removing silence..."

        # Remove silence
        silence_output = os.path.join(job_dir, "no_silence.mp4")
        silence_result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: remove_silence(
                input_path,
                silence_output,
                noise_threshold=options.get("noise_threshold", "-30dB"),
                min_silence_duration=options.get("min_silence_duration", 0.5)
            )
        )

        if not silence_result.get("success"):
            raise Exception(f"Silence removal failed: {silence_result.get('error')}")

        # Update status: generating captions
        jobs[job_id].status = "generating_captions"
        jobs[job_id].progress = 60
        jobs[job_id].message = "Generating captions..."

        # Generate captions
        captions_dir = os.path.join(job_dir, "captions")
        caption_result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: generate_bilingual_captions(
                silence_output,
                captions_dir,
                model_size=options.get("whisper_model", "base")
            )
        )

        # Update status: uploading
        jobs[job_id].status = "uploading"
        jobs[job_id].progress = 85
        jobs[job_id].message = "Uploading processed video..."

        # Upload processed video
        output_url = await upload_to_supabase(silence_output)

        # Update Supabase with results
        await update_supabase_status(shape_id, "completed", {
            "output_url": output_url,
            "metadata": {
                "silence_removal": silence_result,
                "captions": {
                    "success": caption_result.get("success"),
                    "language": caption_result.get("original", {}).get("language"),
                    "segment_count": caption_result.get("original", {}).get("segment_count")
                }
            }
        })

        # Update job status: completed
        jobs[job_id] = JobStatus(
            job_id=job_id,
            status="completed",
            progress=100,
            message="Processing complete!",
            result={
                "output_url": output_url,
                "silence_removal": silence_result,
                "captions": caption_result
            }
        )

    except Exception as e:
        error_message = str(e)
        jobs[job_id] = JobStatus(
            job_id=job_id,
            status="failed",
            progress=0,
            message=f"Processing failed: {error_message}"
        )
        await update_supabase_status(shape_id, "failed", {
            "metadata": {"error": error_message}
        })

    finally:
        # Cleanup (optional - keep files for debugging)
        # import shutil
        # shutil.rmtree(job_dir, ignore_errors=True)
        pass


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/process", response_model=ProcessResponse)
async def start_processing(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Start video processing job."""
    job_id = str(uuid.uuid4())

    # Initialize job status
    jobs[job_id] = JobStatus(
        job_id=job_id,
        status="pending",
        progress=0,
        message="Job queued"
    )

    # Start background processing
    background_tasks.add_task(
        process_video_task,
        job_id,
        request.video_url,
        request.shape_id,
        request.options
    )

    return ProcessResponse(
        job_id=job_id,
        status="pending",
        message="Processing started"
    )


@app.get("/status/{job_id}", response_model=JobStatus)
async def get_status(job_id: str):
    """Get job status."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return jobs[job_id]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
