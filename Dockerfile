# Leto Pipeline — production image (Next.js standalone + Prisma)
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts && npx prisma generate

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npx next build \
 && npx esbuild prisma/seed.ts --bundle --platform=node --format=cjs --target=node20 --external:@prisma/client --external:bcryptjs --external:xlsx --external:dotenv --outfile=dist/seed.cjs --log-level=warning \
 && npx esbuild scripts/migrate-fallback.ts --bundle --platform=node --format=cjs --target=node20 --external:@prisma/client --outfile=dist/migrate-fallback.cjs --log-level=warning \
 && npx esbuild scripts/import-pipeline.ts --bundle --platform=node --format=cjs --target=node20 --external:@prisma/client --external:bcryptjs --external:xlsx --external:dotenv --outfile=dist/import-pipeline.cjs --log-level=warning

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME="::"
# Next standalone server (includes its own traced node_modules)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Prisma client + engines (migrations are applied by dist/migrate-fallback.cjs), and the runtime deps of the bundled scripts
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=build /app/node_modules/xlsx ./node_modules/xlsx
COPY --from=build /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=build /app/node_modules/nodemailer ./node_modules/nodemailer
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p reports
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
