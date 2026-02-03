# 构建阶段
FROM node:20-slim AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

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

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 复制 Prisma schema（用于运行时）
COPY prisma ./prisma

# 创建上传目录
RUN mkdir -p uploads && chmod 777 uploads

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5002

# 暴露端口
EXPOSE 5002

# 启动命令
CMD ["node", "dist/main.js"]
