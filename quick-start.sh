#!/bin/bash

# 🚀 网盘搜索转存系统 - 一键部署脚本
# ===================================
# 傻瓜式操作：下载 → 运行 → 使用

echo "🎯 网盘搜索转存系统 一键部署"
echo "=================================="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查依赖
check_dependencies() {
    echo "🔍 检查依赖..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ 未检测到 Docker${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo -e "${YELLOW}🍎 macOS 用户请安装：${NC}"
            echo "   - Docker Desktop: https://www.docker.com/products/docker-desktop/"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo -e "${YELLOW}🐧 Linux 用户请运行：${NC}"
            echo "   curl -fsSL https://get.docker.com | sudo sh"
            echo "   sudo usermod -aG docker $USER"
            echo "   sudo systemctl enable docker"
        fi
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ 未检测到 Docker Compose${NC}"
        echo -e "${YELLOW}💻 安装方法：${NC}"
        echo "   sudo apt install docker-compose (Ubuntu/Debian)"
        echo "   sudo yum install docker-compose (CentOS/RHEL)"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 依赖检查通过${NC}"
}

# 获取配置信息
get_config() {
    echo ""
    echo "🔧 获取配置信息..."
    echo "=================================="
    
    # TMDb API Key
    echo -n "请输入 TMDb API Key (留空使用默认): "
    read tmdb_key
    if [[ -z "$tmdb_key" ]]; then
        tmdb_key="04f3d954e65c4598b6863fee20fff697"
    fi
    
    # 搜索API端点
    echo -n "请输入搜索API端点 (留空使用默认): "
    read search_api
    if [[ -z "$search_api" ]]; then
        search_api="https://so.252035.xyz/api/search"
    fi
    
    # 电影路径
    echo -n "请输入电影存储路径 (留空使用默认): "
    read movie_path
    if [[ -z "$movie_path" ]]; then
        movie_path="/我的资源/2025/电影"
    fi
    
    # 电视剧路径
    echo -n "请输入电视剧存储路径 (留空使用默认): "
    read tv_path
    if [[ -z "$tv_path" ]]; then
        tv_path="/我的资源/2025/电视剧"
    fi
    
    echo -e "${GREEN}✅ 配置获取完成${NC}"
}

# 创建配置文件
create_config_files() {
    echo ""
    echo "📝 创建配置文件..."
    echo "=================================="
    
    # 创建config.json
    cat > config.json << EOF
{
    "tmdb_api_key": "$tmdb_key",
    "tmdb_language": "zh-CN",
    "search_api_endpoint": "$search_api",
    "movie_path": "$movie_path",
    "tv_path": "$tv_path",
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
    
    # 创建cookie.txt
    touch cookie.txt
    echo -e "${GREEN}✅ 配置文件创建完成${NC}"
    
    # 生成使用说明
    cat > QUICK_START.md << 'EOF'
# 🚀 网盘搜索转存系统 - 快速使用指南

## 1. 启动服务
```bash
./start.sh
```

## 2. 访问主页面
打开浏览器访问：http://localhost:5001/

## 3. 首次使用步骤
1. 进入 **配置管理** 页面 (http://localhost:5001/config)
2. **验证Cookie状态** - 确保显示"文件存在"
3. **保存配置**
4. 返回主页面开始搜索

## 4. 功能页面
- **搜索界面**: http://localhost:5001/search
- **历史记录**: http://localhost:5001/history  
- **状态监控**: http://localhost:5001/status
- **配置管理**: http://localhost:5001/config

## 5. 常用管理命令
```bash
# 查看日志
./logs.sh

# 停止服务
./stop.sh

# 重启服务
./restart.sh

# 更新镜像
./update.sh
```

## 6. Cookie配置说明
如需配置百度网盘Cookie：
1. 登录百度网盘网页版
2. 按F12打开开发者工具
3. 找到Network下的cookie信息
4. 复制到项目根目录的 cookie.txt 文件中
EOF
}

# 主流程
main() {
    echo -e "${BLUE}📋 欢迎使用网盘搜索转存系统一键部署脚本${NC}"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 获取配置
    get_config
    
    # 创建配置文件
    create_config_files
    
    # 检查已有服务
    if docker-compose ps -q | grep -q .; then
        echo -e "${YELLOW}⚠️  检测到已有运行中的容器${NC}"
        read -p "是否停止并重新部署？(y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down --remove-orphans
        else
            exit 0
        fi
    fi
    
    # 启动服务
    echo ""
    echo "🚀开始部署..."
    echo "=================================="
    chmod +x start.sh stop.sh logs.sh restart.sh enter.sh update.sh
    
    # 构建镜像
    echo "📦 构建 Docker 镜像..."
    if ! docker-compose build; then
        echo -e "${RED}❌ 构建失败，请检查错误信息${NC}"
        exit 1
    fi
    
    # 启动容器
    echo "🚀 启动容器..."
    if ! docker-compose up -d; then
        echo -e "${RED}❌ 启动失败，可能端口被占用${NC}"
        exit 1
    fi
    
    # 等待服务启动
    echo "⏳ 等待服务启动..."
    for i in {1..30}; do
        if curl -s --max-time 2 http://localhost:5001/ > /dev/null 2>&1; then
            break
        fi
        echo -n "⏳"
        sleep 1
    done
    
    # 成功提示
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}🎉 网盘搜索转存系统部署成功！${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${BLUE}🔗 访问地址:${NC}"
    echo "  - 主页: http://localhost:5001/"
    echo "  - 配置: http://localhost:5001/config"
    echo ""
    echo -e "${BLUE}📖 更多信息: 查看 QUICK_START.md${NC}"
    echo ""
    
    # 显示当前配置
    echo "📋 当前配置:"
    echo "  - TMDb API: $tmdb_key"
    echo "  - 搜索API: $search_api"
    echo "  - 电影目录: $movie_path"
    echo "  - 电视剧目录: $tv_path"
    echo ""
    
    # 显示容器状态
    echo "📊 容器状态:"
    docker-compose ps
}

# 执行主流程
main "$@"