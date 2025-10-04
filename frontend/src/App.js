import React, { useState, useRef } from "react";
import "./styles.css";
import { getFields, handleUpload } from "./utils";
import { UploadButton } from "./uploadButton";
import { VideoPlayer } from "./videoBlock";
import { ResultVideo } from "./resultVideo";

export default function App() {
    const [file, setFile] = useState(null);
    const [resultUrl, setResultUrl] = useState("");
    const [minArea, setMinArea] = useState(0.01);
    const [maxArea, setMaxArea] = useState(1.0);
    const [skipFrames, setSkipFrames] = useState(10);
    const [loading, setLoading] = useState(false);
    const [segments, setSegments] = useState([]);
    const [error, setError] = useState(""); // новое состояние для ошибок

    const fields = getFields({ minArea, setMinArea, maxArea, setMaxArea, skipFrames, setSkipFrames });
    const originalVideoRef = useRef(null);

    const handleUploadWrapper = async () => {
        setError(""); // сброс ошибки перед загрузкой
        await handleUpload({
            file,
            minArea,
            maxArea,
            skipFrames,
            setLoading,
            setResultUrl,
            setSegments,
            setError, // прокидываем setError в хендлер
        });
    };

    return (
        <div className="app">
            <h2>Удаление пустых частей из видео</h2>

            {/* Панель настроек */}
            <div className="settings">
                <div>
                    <label>Загрузите видео</label>
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                </div>

                {fields.map((f, i) => (
                    <div key={i}>
                        <label>{f.label}</label>
                        <input
                            type={f.type}
                            value={f.value}
                            step={f.step}
                            onChange={(e) => f.setter(f.clamp(e.target.value))}
                        />
                    </div>
                ))}

                <UploadButton onClick={handleUploadWrapper} loading={loading} />

                {error && <div className="error-message">{error}</div>} {/* блок для ошибок */}
            </div>

            {file && (
                <VideoPlayer src={URL.createObjectURL(file)} refVideo={originalVideoRef} segments={segments} />
            )}

            {resultUrl && <ResultVideo src={resultUrl} />}
        </div>
    );
}
