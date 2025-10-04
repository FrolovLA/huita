import React, { useEffect, useState } from "react";
import "./styles.css";

export default function TimelineOverlay({ videoRef, removed }) {
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
