import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

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
        <div
            style={{
                position: "absolute",
                bottom: "19px",
                left: "16px",
                right: "16px",
                height: "6px",
                borderRadius: "3px",
                background: "rgba(0,0,0,0.2)",
                pointerEvents: "none",
            }}
        >
            {removed.map((seg, i) => {
                const left = (seg.start / duration) * 100;
                const width = ((seg.end - seg.start) / duration) * 100;
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `${left}%`,
                            width: `${width}%`,
                            height: "100%",
                            background: "rgba(255,0,0,0.7)",
                        }}
                    />
                );
            })}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: `${progress}%`,
                    height: "100%",
                    background: "limegreen",
                    borderRadius: "3px",
                }}
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
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
                🎬 Удаление пустых частей из видео
            </h2>

            {/* Панель настроек */}
            <div
                style={{
                    padding: "20px",
                    borderRadius: "10px",
                    border: "1px solid #ddd",
                    background: "#f9f9f9",
                    marginBottom: "20px",
                }}
            >
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ fontWeight: "600", display: "block", marginBottom: "6px" }}>
                        Загрузите видео
                    </label>
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                </div>

                <div style={{ marginBottom: "15px" }}>
                    <label style={{ fontWeight: "600", display: "block", marginBottom: "6px" }}>
                        Минимальный размер объекта (0.01 - 1)
                    </label>
                    <input
                        type="number"
                        value={minArea}
                        step="0.01"
                        style={{ width: "120px", padding: "5px" }}
                        onChange={(e) => {
                            let val = parseFloat(e.target.value);
                            if (isNaN(val)) val = 0.01;
                            if (val < 0.01) val = 0.01;
                            if (val > 1) val = 1;
                            setMinArea(val);
                        }}
                    />
                </div>

                <div style={{ marginBottom: "15px" }}>
                    <label style={{ fontWeight: "600", display: "block", marginBottom: "6px" }}>
                        Максимальный размер объекта (0.01 - 1)
                    </label>
                    <input
                        type="number"
                        value={maxArea}
                        step="0.01"
                        style={{ width: "120px", padding: "5px" }}
                        onChange={(e) => {
                            let val = parseFloat(e.target.value);
                            if (isNaN(val)) val = 0.01;
                            if (val < 0.01) val = 0.01;
                            if (val > 1) val = 1;
                            setMaxArea(val);
                        }}
                    />
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontWeight: "600", display: "block", marginBottom: "6px" }}>
                        Количество кадров пропуска (1 - 140)
                    </label>
                    <input
                        type="number"
                        value={skipFrames}
                        style={{ width: "120px", padding: "5px" }}
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
                    style={{
                        padding: "10px 20px",
                        borderRadius: "6px",
                        border: "none",
                        background: loading ? "#999" : "#007bff",
                        color: "white",
                        fontWeight: "600",
                        cursor: loading ? "default" : "pointer",
                    }}
                >
                    {loading ? "⏳ Обработка..." : "Начать обработку"}
                </button>
            </div>

            {/* Видео оригинал */}
            {file && (
                <div style={{ marginBottom: "30px" }}>
                    <h3 style={{ marginBottom: "10px" }}>Исходное видео</h3>
                    <div style={{ position: "relative", display: "inline-block" }}>
                        <video
                            ref={originalVideoRef}
                            src={URL.createObjectURL(file)}
                            controls
                            width="640"
                            style={{
                                display: "block",
                                borderRadius: "10px",
                                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                            }}
                        />
                        <TimelineOverlay videoRef={originalVideoRef} removed={segments} />
                    </div>
                </div>
            )}

            {/* Результат */}
            {resultUrl && (
                <div>
                    <h3 style={{ marginBottom: "10px" }}>Результат</h3>
                    <video
                        controls
                        width="640"
                        src={resultUrl}
                        style={{
                            display: "block",
                            borderRadius: "10px",
                            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                            marginBottom: "10px",
                        }}
                    />
                    <a
                        href={resultUrl}
                        download="result.mp4"
                        style={{ color: "#007bff", fontWeight: "600" }}
                    >
                        ⬇️ Скачать результат
                    </a>
                </div>
            )}
        </div>
    );
}
