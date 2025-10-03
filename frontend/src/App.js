import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./styles.css";

function TimelineOverlay({ videoRef, removed }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            setProgress((video.currentTime / video.duration) * 100);
        };

        video.addEventListener("timeupdate", updateProgress);
        return () => video.removeEventListener("timeupdate", updateProgress);
    }, [videoRef]);

    if (!videoRef.current || !videoRef.current.duration) return null;
    const duration = videoRef.current.duration;

    return (
        <div className="timeline-overlay">
            {removed.map((seg, i) => {
                const left = (seg.start / duration) * 100;
                const width = ((seg.end - seg.start) / duration) * 100;
                return (
                    <div
                        key={i}
                        className="timeline-segment"
                        style={{ left: `${left}%`, width: `${width}%` }}
                    />
                );
            })}
            <div
                className="timeline-progress"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}

export default function App() {
    const [file, setFile] = useState(null);
    const [resultUrl, setResultUrl] = useState("");
    const [minArea, setMinArea] = useState(0.01);
    const [maxArea, setMaxArea] = useState(1.0);
    const [skipFrames, setSkipFrames] = useState(10);
    const [loading, setLoading] = useState(false);
    const [segments, setSegments] = useState([]);

    const originalVideoRef = useRef(null);

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("min_area_ratio", minArea);
        formData.append("max_area_ratio", maxArea);
        formData.append("skip_frames", skipFrames);

        try {
            const res = await axios.post("http://localhost:8000/process_video/", formData, {
                timeout: 5 * 60 * 1000,
            });
            setResultUrl(`http://localhost:8000${res.data.result_video}`);
            setSegments(res.data.removed_segments || []);
        } catch (err) {
            console.error(err);
            alert("Ошибка при обработке видео");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app">
            <h2>🎬 Удаление пустых частей из видео</h2>

            {/* Панель настроек */}
            <div className="settings">
                <div>
                    <label>Загрузите видео</label>
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                </div>

                <div>
                    <label>Минимальный размер объекта (0.01 - 1)</label>
                    <input
                        type="number"
                        value={minArea}
                        step="0.01"
                        onChange={(e) => {
                            let val = parseFloat(e.target.value);
                            if (isNaN(val)) val = 0.01;
                            if (val < 0.01) val = 0.01;
                            if (val > 1) val = 1;
                            setMinArea(val);
                        }}
                    />
                </div>

                <div>
                    <label>Максимальный размер объекта (0.01 - 1)</label>
                    <input
                        type="number"
                        value={maxArea}
                        step="0.01"
                        onChange={(e) => {
                            let val = parseFloat(e.target.value);
                            if (isNaN(val)) val = 0.01;
                            if (val < 0.01) val = 0.01;
                            if (val > 1) val = 1;
                            setMaxArea(val);
                        }}
                    />
                </div>

                <div>
                    <label>Количество кадров пропуска (1 - 140)</label>
                    <input
                        type="number"
                        value={skipFrames}
                        onChange={(e) => {
                            let val = parseInt(e.target.value);
                            if (isNaN(val)) val = 1;
                            if (val > 140) val = 140;
                            if (val < 1) val = 1;
                            setSkipFrames(val);
                        }}
                    />
                </div>

                <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="upload-btn"
                >
                    {loading ? "⏳ Обработка..." : "Начать обработку"}
                </button>
            </div>

            {/* Видео оригинал */}
            {file && (
                <div className="video-container">
                    <h3>Исходное видео</h3>
                    <div className="video-box">
                        <video
                            ref={originalVideoRef}
                            src={URL.createObjectURL(file)}
                            controls
                            width="640"
                        />
                        <TimelineOverlay videoRef={originalVideoRef} removed={segments} />
                    </div>
                </div>
            )}

            {/* Результат */}
            {resultUrl && (
                <div>
                    <h3>Результат</h3>
                    <video controls width="640" src={resultUrl} />
                    <a href={resultUrl} download="result.mp4" className="download-link">
                        ⬇️ Скачать результат
                    </a>
                </div>
            )}
        </div>
    );
}
