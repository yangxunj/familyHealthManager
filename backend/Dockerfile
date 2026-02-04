# 构建阶段
FROM node:20-slim AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@8

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:20-slim AS production

WORKDIR /app

# 安装 poppler-utils（用于 PDF 转图片）和其他必要工具
RUN apt-get update && apt-get install -y \
    poppler-utils \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# 从构建阶段复制所需文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/package.json ./

# 创建上传目录
RUN mkdir -p uploads && chmod 777 uploads

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5002

# 暴露端口
EXPOSE 5002

# 启动命令：先执行数据库迁移，再启动应用
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
