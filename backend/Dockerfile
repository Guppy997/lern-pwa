FROM node:24-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54

WORKDIR /app

# Lockfile mitkopieren + npm ci: baut exakt die geprüften Versionen statt bei
# jedem Build neu innerhalb der ^-Ranges aufzulösen
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

VOLUME /app/data
ENV DB_PATH=/app/data/lern.sqlite
ENV PORT=3001
EXPOSE 3001

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "src/index.js"]
