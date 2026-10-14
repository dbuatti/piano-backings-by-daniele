# Playwright + Chromium image so the poster runs anywhere (Fly.io, Railway, a VPS).
# Pin the tag to the `playwright` version in package.json.
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

# Persisted Chromium profile (the logged-in session) lives on a mounted volume.
ENV USER_DATA_DIR=/data/profile
ENV HEADLESS=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

CMD ["npx", "tsx", "src/index.ts"]
