# ========================
# Bardic Tunes - Dockerfile
# ========================

FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar archivos de dependencias primero (mejor caché de capas)
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --omit=dev

# Copiar el resto del código fuente
COPY . .

# Crear la carpeta de música por si no existe
RUN mkdir -p /app/music

# Exponer el puerto del servidor
EXPOSE 3000

# Usuario no-root por seguridad
RUN addgroup -S bardic && adduser -S bardic -G bardic
RUN chown -R bardic:bardic /app
USER bardic

# Arrancar el servidor
CMD ["node", "server.js"]
