# 1. Базовый образ Node
FROM node:20-alpine AS build

# 2. Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package-файлы и устанавливаем зависимости
COPY package.json package-lock.json ./
RUN npm ci

# Копируем весь фронтенд (src, public и др.)
COPY . .

# Сборка фронтенда
RUN npm run build


# 8. Минимальный образ для запуска
FROM nginx:alpine

# 9. Копируем собранный фронт в nginx
COPY --from=build /app/build /usr/share/nginx/html


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
