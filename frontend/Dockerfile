# 构建阶段
FROM node:20-slim AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@8

# 通过构建参数传入前端环境变量（Vite 在构建时注入）
ARG VITE_API_BASE_URL=/api/v1
# Supabase 使用占位符，容器启动时由 entrypoint 脚本替换为实际值
ARG VITE_SUPABASE_URL=__SUPABASE_URL_PLACEHOLDER__
ARG VITE_SUPABASE_ANON_KEY=__SUPABASE_ANON_KEY_PLACEHOLDER__

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建
RUN pnpm build

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制 entrypoint 脚本（运行时替换 Supabase 环境变量）
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
