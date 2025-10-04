export const ResultVideo = ({ src }) => (
    <div style={{display: 'flex', flexDirection: 'column', gap:'10px'}}>
        <h3>Результат</h3>
        <video controls width="640" src={src} />
        <a href={src} download="result.mp4" className="download-link">
            ⬇️ Скачать результат
        </a>
    </div>
);
