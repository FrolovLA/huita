import os
import tempfile
import subprocess
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2

app = FastAPI()
model = YOLO("yolov8n.pt")

# === CORS для React ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VIDEO_DIR = tempfile.mkdtemp()
RESULTS_DIR = tempfile.mkdtemp()


# --- Вспомогательные функции ---
def save_upload(file: UploadFile, target_dir: str) -> str:
    path = os.path.join(target_dir, file.filename)
    with open(path, "wb") as f:
        while chunk := file.file.read(1024 * 1024):
            f.write(chunk)
    return path


def analyze_video(video_path: str, min_area: float, max_area: float, skip_frames: int):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    presence = []
    frame_idx = 0
    found_person = False
    found_valid_size = False

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % skip_frames == 0:
            scale = 640 / frame.shape[1]
            frame_resized = cv2.resize(frame, (640, int(frame.shape[0] * scale)))

            results = model(frame_resized, verbose=False)[0]
            frame_found = False

            for box, cls in zip(results.boxes.xyxy, results.boxes.cls):
                if int(cls) != 0:
                    continue
                found_person = True
                x1, y1, x2, y2 = box
                area_ratio = ((x2 - x1) * (y2 - y1)) / (640 * frame_resized.shape[0])
                if min_area <= area_ratio <= max_area:
                    frame_found = True
                    found_valid_size = True
                    break

            presence.append(frame_found)
        else:
            presence.append(presence[-1] if presence else False)

        frame_idx += 1

    cap.release()
    return presence, fps, duration, found_person, found_valid_size


def extract_segments(presence: list, fps: float):
    segments = []
    removed_segments = []
    i = 0
    while i < len(presence):
        if presence[i]:
            start = i
            while i < len(presence) and presence[i]:
                i += 1
            segments.append((start / fps, (i - 1) / fps))
        else:
            start = i
            while i < len(presence) and not presence[i]:
                i += 1
            removed_segments.append({"start": round(start / fps, 2), "end": round((i - 1) / fps, 2)})
    return segments, removed_segments


def concat_segments(video_path: str, segments: list, result_path: str):
    if not segments:
        return video_path

    with tempfile.TemporaryDirectory() as tmpdir:
        part_files = []
        for idx, (s, e) in enumerate(segments):
            part = os.path.join(tmpdir, f"part{idx}.mp4")
            subprocess.run([
                "ffmpeg", "-y", "-ss", str(s), "-to", str(e),
                "-i", video_path, "-c", "copy", part
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            part_files.append(part)

        list_file = os.path.join(tmpdir, "list.txt")
        with open(list_file, "w") as f:
            for p in part_files:
                f.write(f"file '{p}'\n")

        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", list_file, "-c", "copy", result_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return result_path


# === Основной эндпоинт ===
@app.post("/process_video/")
async def process_video(
    file: UploadFile = File(...),
    min_area_ratio: float = Form(0.01),
    max_area_ratio: float = Form(1.0),
    skip_frames: int = Form(10)
):
    video_path = save_upload(file, VIDEO_DIR)

    presence, fps, duration, has_person, has_valid_size = analyze_video(
        video_path, min_area_ratio, max_area_ratio, skip_frames
    )

    if not has_person:
        raise HTTPException(status_code=400, detail="В видео не найдено людей")
    if not has_valid_size:
        raise HTTPException(
            status_code=400,
            detail="Объекты есть, но ни один не соответствует заданным размерам"
        )

    segments, removed_segments = extract_segments(presence, fps)

    result_path = os.path.join(RESULTS_DIR, "result.mp4")
    result_path = concat_segments(video_path, segments, result_path)

    return {
        "result_video": f"/download/{os.path.basename(result_path)}",
        "removed_segments": removed_segments,
        "duration": duration,
        "presence": presence
    }


@app.get("/download/{filename}")
async def download_video(filename: str):
    path = os.path.join(RESULTS_DIR, filename)
    if not os.path.exists(path):
        return {"error": "file not found"}
    return FileResponse(path, media_type="video/mp4", filename=filename)
