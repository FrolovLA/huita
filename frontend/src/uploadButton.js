export const UploadButton = ({ onClick, loading }) => (
    <button onClick={onClick} disabled={loading} className="upload-btn">
        {loading ? "⏳ Обработка..." : "Начать обработку"}
    </button>
);
