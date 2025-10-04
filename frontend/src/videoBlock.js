import TimelineOverlay from "./TimeLineOverlay";

export const VideoPlayer = ({ src, refVideo, segments }) => (
    <div className="video-box">
        <video ref={refVideo} src={src} controls width="640" />
        {segments && <TimelineOverlay videoRef={refVideo} removed={segments} />}
    </div>
);
