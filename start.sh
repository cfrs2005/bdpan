#!/bin/bash

# 网盘搜索转存系统 Docker 启动脚本
echo "🎯 网盘搜索转存系统 Docker 启动器"
echo "=================================="
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：未检测到 Docker 安装"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误：未检测到 docker-compose 安装"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# 设置环境变量
export COMPOSE_PROJECT_NAME=bdpan-search
export FLASK_ENV=production

# 检查配置文件
if [[ ! -f "config.json" ]]; then
    echo "⚠️  警告：未找到 config.json，将使用默认配置"
    cat > config.json << 'EOF'
{
    "tmdb_api_key": "04f3d954e65c4598b6863fee20fff697",
    "tmdb_language": "zh-CN",
    "search_api_endpoint": "https://so.252035.xyz/api/search",
    "movie_path": "/我的资源/2025/电影",
    "tv_path": "/我的资源/2025/电视剧",
    "server_host": "0.0.0.0",
    "server_port": 5001,
    "debug_mode": true,
    "api_prefix": "/api",
    "max_logs": 500,
    "search_timeout": 30,
    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "custom_cookies": ""
}
EOF
    echo "✅ 已创建默认配置文件"
fi

if [[ ! -f "cookie.txt" ]]; then
    echo "⚠️  警告：未找到 cookie.txt"
    echo "请稍后通过配置页面添加有效的百度网盘 Cookie"
    touch cookie.txt
    echo "✅ 已创建 cookie.txt 空文件"
fi

# 显示当前配置
echo "📋 当前配置预览:"
echo "- 监听端口: 5001"
echo "- 配置文件: $(pwd)/config.json"
echo "- Cookie文件: $(pwd)/cookie.txt"
echo "- 日志目录: ./logs (自动创建)"
echo ""

# 创建日志目录
mkdir -p logs

# 清理旧的本地容器
echo "🧹 清理旧的容器..."
docker-compose down --remove-orphans 2>/dev/null || true

# 可选：强制清理所有相关容器和镜像
case "$1" in
    "--clean")
        echo "🧽 执行深度清理..."
        docker-compose down --rmi all --volumes --remove-orphans 2>/dev/null || true
        docker system prune -f 2>/dev/null || true
        ;;
    "--rebuild")
        echo "🏗️  强制重建镜像..."
        docker-compose build --no-cache
        ;;
    "--force")
        echo "🛑 强制停止并清理..."
        docker stop bdpan 2>/dev/null || true
        docker rm bdpan 2>/dev/null || true
        ;;
esac

# 检查是否需要重建镜像（只检查Docker相关文件）
REBUILD_NEEDED=false
DOCKER_FILES="Dockerfile requirements.txt pyproject.toml"

# 检查Docker相关文件是否修改
for file in $DOCKER_FILES; do
    if [ -f "$file" ] && [ "$(find "$file" -mmin -5)" ]; then
        echo "🔄 检测到 $file 修改，需要重建镜像"
        REBUILD_NEEDED=true
        break
    fi
done

# 检查镜像是否存在
if ! docker images | grep -q "bdpan-bdpan-search"; then
    echo "📦 未找到现有镜像，需要构建"
    REBUILD_NEEDED=true
fi

# 构建镜像
echo "📦 准备 Docker 镜像..."
if [ "$REBUILD_NEEDED" = true ]; then
    echo "🏗️  重建镜像（检测到依赖变更）..."
    if ! docker-compose build --no-cache; then
        echo "❌ 构建失败，请检查 Dockerfile 和依赖"
        exit 1
    fi
else
    echo "✅ 使用现有镜像（代码通过volume挂载，无需重建）"
    # 确保镜像存在
    docker-compose build > /dev/null 2>&1 || true
fi

# 启动容器
echo "🚀 启动容器..."
if docker-compose up -d; then
    echo "✅ 容器启动成功！"
else
    echo "❌ 启动失败，检查端口占用和权限"
    exit 1
fi

# 等待服务启动
echo "⏳ 等待服务启动..."
for i in {1..30}; do
    if curl -s http://localhost:5001/ > /dev/null; then
        echo "🎉 服务已就绪！"
        break
    fi
    echo -n "."
    sleep 1
done

# 显示服务状态
echo ""
echo "========================================="
echo "🎉 网盘搜索转存系统已成功启动！"
echo "========================================="
echo ""
echo "🔗 访问地址:"
echo "  - 主页面:    http://localhost:5001/"
echo "  - 搜索界面:  http://localhost:5001/search"
echo "  - 历史记录:  http://localhost:5001/history"
echo "  - 状态监控:  http://localhost:5001/status"
echo "  - 配置管理:  http://localhost:5001/config"
echo ""
echo "📱 局域网访问:"
echo "  获取本地IP:"
echo "    macOS: ipconfig getifaddr en0"
echo "    Linux: ip addr show"
echo ""
echo "🔧 管理命令:"
echo "  - 查看日志:   docker-compose logs -f"
echo "  - 停止服务:   docker-compose down"
echo "  - 重启服务:   docker-compose restart"
echo "  - 更新容器:   docker-compose down && docker-compose up -d --build"
echo "  - 强制重建:   ./start.sh --rebuild"
echo "  - 深度清理:   ./start.sh --clean"
echo ""

# 显示容器状态
echo "📊 容器状态:"
docker-compose ps