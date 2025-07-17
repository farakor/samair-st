# Используем официальный образ Node.js
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем React приложение
RUN npm run build

# Создаем директории для данных
RUN mkdir -p server/data/config server/data/uploads

# Устанавливаем права на директории
RUN chmod -R 755 server/data

# Открываем порт
EXPOSE 3001

# Создаем пользователя без root прав
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Устанавливаем владельца файлов
RUN chown -R nextjs:nodejs /app
USER nextjs

# Запускаем сервер
CMD ["npm", "run", "server"] 