import axios from "axios";

// Ограничение числа в пределах [min, max]
export function clampNumber(value, min, max, fallback = min) {
    let num = parseFloat(value);
    if (isNaN(num)) return fallback;
    if (num < min) return min;
    if (num > max) return max;
    return num;
}

// Для целых чисел
export function clampInt(value, min, max, fallback = min) {
    let num = parseInt(value, 10);
    if (isNaN(num)) return fallback;
    if (num < min) return min;
    if (num > max) return max;
    return num;
}

// Хендлер загрузки
export async function handleUpload({
                                       file,
                                       minArea,
                                       maxArea,
                                       skipFrames,
                                       setLoading,
                                       setResultUrl,
                                       setSegments,
                                       setError, // новое
                                   }) {
    if (!file) return;
    setLoading(true);
    setError("");

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
        if (err.response && err.response.data && err.response.data.detail) {
            setError(err.response.data.detail); // вывод ошибки на страницу
        } else {
            setError("Ошибка при обработке видео");
        }
    } finally {
        setLoading(false);
    }
}

export const getFields = ({ minArea, setMinArea, maxArea, setMaxArea, skipFrames, setSkipFrames }) => [
    {
        label: "Минимальный размер объекта (0.01 - 1)",
        value: minArea,
        setter: setMinArea,
        clamp: (v) => clampNumber(v, 0.01, 1, 0.01),
        type: "number",
        step: 0.01,
    },
    {
        label: "Максимальный размер объекта (0.01 - 1)",
        value: maxArea,
        setter: setMaxArea,
        clamp: (v) => clampNumber(v, 0.01, 1, 0.01),
        type: "number",
        step: 0.01,
    },
    {
        label: "Количество кадров пропуска (1 - 140)",
        value: skipFrames,
        setter: setSkipFrames,
        clamp: (v) => clampInt(v, 1, 140, 1),
        type: "number",
    },
];

