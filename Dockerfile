FROM node:22-bookworm-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-venv \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHON_BIN=/opt/venv/bin/python
ENV PROPHET_SCRIPT_PATH=/app/scripts/run_prophet.py
ENV NEXT_TELEMETRY_DISABLED=1


FROM base AS builder

COPY package.json package-lock.json ./
RUN npm install -g npm@11.6.2
RUN npm ci

COPY requirements.txt ./
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY . .
RUN npm run build
RUN npm prune --omit=dev


FROM base AS runtime

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /opt/venv /opt/venv
COPY --from=builder --chown=node:node /app /app

USER node

EXPOSE 3000

CMD ["npm", "start"]