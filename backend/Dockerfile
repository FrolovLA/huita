FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg libgl1 libglib2.0-0 wget && \
    rm -rf /var/lib/apt/lists/*

RUN python -m pip install --upgrade pip

RUN pip install torch==2.8.0+cpu --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN sed -i '/torch/d' requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]