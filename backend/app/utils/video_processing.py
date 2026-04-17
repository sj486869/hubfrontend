import json
import subprocess
import shutil
from pathlib import Path

from fastapi import HTTPException, status

from .uploads import STREAM_DIRECTORY, UPLOAD_ROOT

HLS_SEGMENT_SECONDS = 4


def _run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='ffmpeg tools are not installed on this server',
        ) from exc
    except subprocess.CalledProcessError as exc:
        detail = exc.stderr.strip() or exc.stdout.strip() or 'Video processing failed'
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail) from exc


def detect_duration_seconds(video_path: Path) -> float:
    result = _run_command(
        [
            'ffprobe',
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'json',
            str(video_path),
        ]
    )
    payload = json.loads(result.stdout)
    duration_value = float(payload.get('format', {}).get('duration') or 0)
    if duration_value <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unable to detect video duration')
    return duration_value


def format_duration(duration_seconds: float) -> str:
    total = max(int(round(duration_seconds)), 1)
    hours = total // 3600
    minutes = (total % 3600) // 60
    seconds = total % 60
    if hours > 0:
        return f'{hours:02d}:{minutes:02d}:{seconds:02d}'
    return f'{minutes:02d}:{seconds:02d}'


def create_hls_stream(video_path: Path) -> tuple[Path, float]:
    duration_seconds = detect_duration_seconds(video_path)
    stream_folder = (UPLOAD_ROOT / STREAM_DIRECTORY / video_path.stem).resolve()
    if stream_folder.exists():
        shutil.rmtree(stream_folder, ignore_errors=True)
    stream_folder.mkdir(parents=True, exist_ok=True)
    playlist_path = stream_folder / 'index.m3u8'
    segment_pattern = stream_folder / 'segment_%03d.ts'

    _run_command(
        [
            'ffmpeg',
            '-y',
            '-i',
            str(video_path),
            '-preset',
            'veryfast',
            '-g',
            '48',
            '-sc_threshold',
            '0',
            '-c:v',
            'libx264',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            '-f',
            'hls',
            '-hls_time',
            str(HLS_SEGMENT_SECONDS),
            '-hls_playlist_type',
            'vod',
            '-hls_flags',
            'independent_segments',
            '-hls_segment_filename',
            str(segment_pattern),
            str(playlist_path),
        ]
    )

    return playlist_path, duration_seconds
