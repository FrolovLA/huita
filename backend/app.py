import os
import tempfile
import subprocess
from fastapi import FastAPI, UploadFile, File, Form
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


@app.post("/process_video/")
async def process_video(
    file: UploadFile = File(...),
    min_area_ratio: float = Form(0.01),
    max_area_ratio: float = Form(1.0),
    skip_frames: int = Form(10)
):
    # --- сохраняем видео на диск ---
    video_path = os.path.join(VIDEO_DIR, file.filename)
    with open(video_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    presence = []
    frame_idx = 0

    # --- анализ видео ---
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % skip_frames == 0:
            scale = 640 / frame.shape[1]
            new_h = int(frame.shape[0] * scale)
            frame_resized = cv2.resize(frame, (640, new_h))

            results = model(frame_resized, verbose=False)[0]
            found = False
            for box, cls in zip(results.boxes.xyxy, results.boxes.cls):
                if int(cls) == 0:  # класс "человек"
                    x1, y1, x2, y2 = box
                    area = (x2 - x1) * (y2 - y1)
                    if min_area_ratio <= area / (640 * new_h) <= max_area_ratio:
                        found = True
                        break
            presence.append(found)
        else:
            presence.append(presence[-1] if presence else False)

        frame_idx += 1

    cap.release()

    # --- сегменты ---
    segments = []
    removed_segments = []
    i = 0
    while i < len(presence):
        if presence[i]:
            start = i
            j = i
            while j < len(presence) and presence[j]:
                j += 1
            segments.append((start / fps, (j - 1) / fps))
            i = j
        else:
            start = i
            j = i
            while j < len(presence) and not presence[j]:
                j += 1
            removed_segments.append({
                "start": round(start / fps, 2),
                "end": round((j - 1) / fps, 2)
            })
            i = j

    # --- склеиваем найденные куски ---
    out_path = os.path.join(RESULTS_DIR, "result.mp4")
    tmpdir = tempfile.mkdtemp()
    part_files = []

    for idx, (s, e) in enumerate(segments):
        part = os.path.join(tmpdir, f"part{idx}.mp4")
        subprocess.run([
            "ffmpeg", "-y",
            "-ss", str(s), "-to", str(e),
            "-i", video_path,
            "-c", "copy", part
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        part_files.append(part)

    if part_files:
        list_file = os.path.join(tmpdir, "list.txt")
        with open(list_file, "w") as f:
            for p in part_files:
                f.write(f"file '{p}'\n")

        subprocess.run([
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", list_file,
            "-c", "copy", out_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        # если ни одного сегмента с человеком — пустое видео
        out_path = video_path

    return {
        "result_video": f"/download/{os.path.basename(out_path)}",
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
