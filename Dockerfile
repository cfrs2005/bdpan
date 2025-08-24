
# 阶段1: 安装构建依赖
FROM python:3.10-slim AS builder

# 安装必要构建工具
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先复制依赖文件以利用缓存
COPY requirements.txt .

# 安装依赖到虚拟环境
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# 阶段2: 创建最终镜像
FROM python:3.10-slim

# 设置时区和环境变量
ENV PYTHONUNBUFFERED=1 \
    TZ=Asia/Shanghai \
    PATH="/opt/venv/bin:$PATH"

# 从构建阶段复制虚拟环境
COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

# 复制应用代码
COPY main.py config.py auth_manager.py .
COPY cookie.txt .
COPY templates ./templates/
COPY static ./static/
COPY requirements.txt .
COPY pyproject.toml .

# 确保静态文件和数据目录
RUN mkdir -p templates static/css static/js static/assets

# 暴露 Flask 应用运行的端口
EXPOSE 5001

# 容器启动命令
CMD ["python", "main.py"]
