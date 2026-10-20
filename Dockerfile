FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/
COPY frontend/index.html frontend/tsconfig*.json frontend/vite.config.ts ./
RUN npm run build

FROM python:3.13-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 CELEBRAI_LIVE_ENABLED=false MOMENTA_DEMO_DATA=/var/lib/momenta
WORKDIR /app
COPY requirements-public.txt ./
RUN pip install --no-cache-dir -r requirements-public.txt \
    && useradd --uid 10001 --create-home momenta \
    && mkdir -p /var/lib/momenta && chown momenta:momenta /var/lib/momenta
COPY celebrai/ ./celebrai/
COPY webapi/ ./webapi/
COPY --from=frontend /build/dist ./frontend/dist
USER momenta
EXPOSE 10000
CMD ["sh", "-c", "exec uvicorn webapi.public_demo:create_public_app --factory --host 0.0.0.0 --port ${PORT:-10000} --workers 1 --no-access-log"]
