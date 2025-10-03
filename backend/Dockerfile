FROM python:3.10-slim

WORKDIR /app

# Устанавливаем системные пакеты
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libgl1 libglib2.0-0 wget \
    && rm -rf /var/lib/apt/lists/*

# Обновляем pip и ставим torch отдельно
RUN python -m pip install --upgrade pip \
    && pip install torch==2.8.0+cpu --index-url https://download.pytorch.org/whl/cpu

# Сначала только requirements.txt (без torch)
COPY requirements.txt .
RUN sed -i '/torch/d' requirements.txt \
    && pip install --no-cache-dir -r requirements.txt

# Теперь копируем весь код
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]