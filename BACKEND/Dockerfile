# ==========================================
# Stage 1: Build the React Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend

COPY FRONTEND/package*.json ./
RUN npm install

COPY FRONTEND/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Backend + Static Assets
# ==========================================
FROM node:22-alpine AS production
WORKDIR /app

COPY BACKEND/package*.json ./
RUN npm install --omit=dev

COPY BACKEND/ ./
# Copy built React frontend to backend public folder
COPY --from=frontend-builder /build/frontend/dist ./public

EXPOSE 5000

ENV PORT=5000 \
    NODE_ENV=production \
    DB_PATH=/app/exam_result_analysis.db

CMD ["npm", "start"]

