import requests
import json
import os
import subprocess
import traceback
import logging
import time
from datetime import datetime
from tmdbv3api import TMDb, Search
from flask import Flask, request, render_template, jsonify, session
from flask_cors import CORS
import sys

# 直接设置日志，不要函数包装
log_dir = "/app/logs"
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"{log_dir}/app.log", encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# 电影和电视剧在网盘中的存储路径
MOVIE_PATH = "/我的资源/2025/电影"
TV_SHOW_PATH = "/我的资源/2025/电视剧"

def check_auth_ready():
    """
    检查是否有可用的BaiduPCS认证
    """
    try:
        auth_mgr = get_auth_manager()
        if not auth_mgr:
            return False, "BaiduPCS-Py库不可用"
        
        _, api = auth_mgr.get_current_account()
        if api:
            success, message = auth_mgr.test_account()
            return success, message
        else:
            return False, "请先在配置页面添加您的Baidu网盘账户"
    except Exception as e:
        return False, f"认证检查失败: {str(e)}"

def search_media(keyword):
    """
    根据关键字搜索影视资源。
    """
    url = 'https://so.252035.xyz/api/search'
    headers = {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'origin': 'https://so.252035.xyz',
        'referer': 'https://so.252035.xyz/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
    }
    data = {
        "kw": keyword,
        "src": "tg",
        "cloud_types": ["baidu"]
    }
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"搜索请求失败: {e}")
        return None

def get_media_type(title):
    """
    使用 TMDb API 判断是电影还是电视剧。
    """
    try:
        config = get_config()
        api_key = config.get('tmdb_api_key')
        if not api_key:
            logger.error("TMDB API Key未配置")
            return None
            
        logger.info(f"开始查询媒体类型: {title}")
        
        tmdb = TMDb()
        tmdb.api_key = api_key
        tmdb.language = config.get('tmdb_language', 'zh-CN')
        
        search = Search()
        search_movie = search.movies(title)
        search_tv = search.tv_shows(title)

        movie_results = search_movie.results
        tv_results = search_tv.results

        movie_popularity = movie_results[0].popularity if movie_results else 0
        tv_popularity = tv_results[0].popularity if tv_results else 0

        result_type = 'movie' if movie_popularity > tv_popularity else ('tv' if tv_popularity > 0 else None)
        logger.info(f"媒体类型判断结果: {title} -> {result_type}")
        return result_type
        
    except Exception as e:
        logger.error(f"TMDb API 请求失败: {e}")
        logger.error(traceback.format_exc())
        return None

def save_to_pan_cli(shared_url, password, target_dir):
    """
    使用 BaiduPCS-Py 命令行工具将资源转存到百度网盘。
    """
    command = [
        "BaiduPCS-Py",
        "save",
        "--NV",
        shared_url,
        target_dir,
        "-p",
        password
    ]
    log_messages = []
    try:
        log_messages.append(f"正在执行命令: {' '.join(command)}")
        result = subprocess.run(command, check=True, capture_output=True, text=True, encoding='utf-8')
        log_messages.append("命令执行成功。")
        log_messages.append(f"输出: {result.stdout}")
        return "\n".join(log_messages)
    except FileNotFoundError:
        error_message = "错误: 'BaiduPCS-Py' 命令未找到。请确保它已安装并在 PATH 中。"
        log_messages.append(error_message)
        return "\n".join(log_messages)
    except subprocess.CalledProcessError as e:
        error_message = f"命令执行失败，返回码: {e.returncode}\n错误输出: {e.stderr}"
        log_messages.append(error_message)
        return "\n".join(log_messages)
    except Exception as e:
        error_message = f"执行转存命令时发生未知错误: {e}"
        log_messages.append(error_message)
        return "\n".join(log_messages)

def run_workflow(keyword):
    """
    执行从搜索到转存的完整工作流
    """
    logs = []

    ready, msg = check_auth_ready()
    if not ready:
        logs.append(f"错误: {msg}")
        return {"status": "error", "logs": logs}

    logs.append(f"正在搜索: {keyword}...")
    search_results = search_media(keyword)

    if not search_results or not search_results.get('data', {}).get('merged_by_type', {}).get('baidu'):
        logs.append("未找到相关资源。")
        return {"status": "error", "logs": logs}

    try:
        best_result = sorted(search_results['data']['merged_by_type']['baidu'], key=lambda x: x['datetime'], reverse=True)[0]
    except (IndexError, KeyError):
        logs.append("搜索结果格式不正确，无法找到最佳匹配。")
        return {"status": "error", "logs": logs}
        
    title = best_result.get('note', '').split('/')[0].strip()
    link = best_result.get('url')
    password = best_result.get('password')

    if not all([title, link, password]):
        logs.append("错误: 搜索结果缺少必要信息。")
        return {"status": "error", "logs": logs}

    logs.append(f"找到资源: {title}")
    logs.append(f"判断影视类型...")
    media_type = get_media_type(keyword)

    if media_type == 'movie':
        logs.append("类型: 电影")
        result = save_to_pan_api(link, password, MOVIE_PATH)
        logs.append(result)
    elif media_type == 'tv':
        logs.append("类型: 电视剧")
        result = save_to_pan_api(link, password, TV_SHOW_PATH)
        logs.append(result)
    else:
        logs.append("未能确定影视类型，不执行转存。")
    
    return {"status": "success", "logs": logs}

app = Flask(__name__)
# 启用CORS支持Chrome插件调用（开发模式允许所有来源）
CORS(app, origins=["*"], methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type"])
app.config['JSON_AS_ASCII'] = False

@app.route('/')
@app.route('/index')
@app.route('/home')
def home():
    """
    主页显示搜索页面
    """
    return render_template('search.html')

@app.route('/history')
def history():
    """
    查看搜索历史记录页面
    """
    return render_template('history.html')

@app.route('/status')
def status():
    """
    系统状态监控页面
    """
    return render_template('status.html')

@app.route('/config')
def config():
    """
    系统配置管理页面
    """
    return render_template('config.html')

@app.route('/top100')
def top100():
    """
    Top100 影视榜单页面
    """
    return render_template('top100.html')

@app.route('/api/save', methods=['POST', 'OPTIONS'])
def api_save_media():
    """
    通过 API 接收关键字并执行转存工作流。
    """
    # 处理OPTIONS预检请求
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    
    data = request.get_json()
    if not data or 'keyword' not in data:
        response = jsonify({"status": "error", "message": "请求体中必须包含 'keyword' 字段。"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400

    keyword = data['keyword']
    result = run_workflow(keyword)
    
    response = jsonify(result)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/api/config', methods=['GET', 'POST'])
def api_config():
    """
    获取或保存系统配置
    """
    if request.method == 'GET':
        # 返回当前配置
        config = get_config()
        # 隐藏敏感信息
        return_config = config.copy()
        if 'tmdb_api_key' in return_config:
            # 只显示前4位，其余用星号替代
            key = return_config['tmdb_api_key']
            return_config['tmdb_api_key_masked'] = len(key) > 4 and key[:4] + '*' * (len(key) - 8) + key[-4:] or '*' * len(key)
            # 返回实际长度但不显示内容
            return_config['tmdb_api_key_length'] = len(key)
            # 移除实际密钥
            del return_config['tmdb_api_key']
        return jsonify(return_config)
    
    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "请求体不能为空"}), 400
        
        # 获取完整配置以保留未提供的字段
        current_config = get_config()
        
        # 只更新提供的字段
        config_fields = [
            'tmdb_api_key', 'tmdb_language', 'search_api_endpoint',
            'movie_path', 'tv_path', 'server_host', 'server_port',
            'debug_mode', 'api_prefix', 'max_logs', 'search_timeout',
            'user_agent', 'custom_cookies'
        ]
        
        updated_config = current_config.copy()
        for field in config_fields:
            if field in data:
                if field == 'server_port':
                    updated_config[field] = int(data[field])
                elif field == 'debug_mode':
                    updated_config[field] = bool(data[field])
                else:
                    updated_config[field] = data[field]
        
        if save_config(updated_config):
            # 全局配置更新
            global config_data
            config_data = updated_config
            return jsonify({"status": "success", "message": "配置已保存"})
        else:
            return jsonify({"status": "error", "message": "保存配置文件失败"}), 500

@app.route('/api/status/system')
def api_system_status():
    """
    获取系统状态信息
    """
    return jsonify({
        "status": "ok",
        "python_version": "3.8+",
        "flask_version": "2.3+",
        "uptime": f"{int((time.time() - startup_time) // 60)} 分钟"
    })

@app.route('/api/recommendations')
def api_recommendations():
    """
    获取最新的影视推荐
    """
    try:
        import requests
        
        recommendations = []
        
        # 不适合的内容关键词过滤
        adult_keywords = ['拔作', '成人', '18+', '限制级', 'adult', 'hentai', 'ecchi']
        
        # 随机选择页面增加内容多样性
        import random
        movie_page = random.randint(1, 3)
        tv_page = random.randint(1, 3)
        
        # 获取多种类型的电影内容
        config = get_config()
        api_key = config.get('tmdb_api_key')
        movie_endpoints = [
            f"https://api.themoviedb.org/3/movie/popular?api_key={api_key}&language=zh-CN&region=CN&page={movie_page}",
            f"https://api.themoviedb.org/3/movie/top_rated?api_key={api_key}&language=zh-CN&region=CN&page=1",
            f"https://api.themoviedb.org/3/movie/now_playing?api_key={api_key}&language=zh-CN&region=CN&page=1"
        ]
        
        all_movies = []
        for url in movie_endpoints:
            try:
                response = requests.get(url, timeout=5)
                data = response.json()
                all_movies.extend(data.get('results', []))
            except Exception as e:
                print(f"获取电影数据失败: {e}")
        
        # 随机打乱并选择电影
        if all_movies:
            random.shuffle(all_movies)
            movie_count = 0
            for movie in all_movies:
                # 过滤不适合内容
                title = movie.get('title', '')
                overview = movie.get('overview', '')
                if movie.get('adult', False) or any(keyword in title.lower() or keyword in overview.lower() for keyword in adult_keywords):
                    continue
                    
                recommendations.append({
                    'name': title,
                    'type': 'movie',
                    'icon': 'film',
                    'poster': f"https://image.tmdb.org/t/p/w300{movie.get('poster_path', '')}" if movie.get('poster_path') else None,
                    'rating': movie.get('vote_average', 0),
                    'year': movie.get('release_date', '')[:4] if movie.get('release_date') else ''
                })
                movie_count += 1
                if movie_count >= 5:  # 增加到5个电影
                    break
        
        # 获取多种类型的电视剧内容
        tv_endpoints = [
            f"https://api.themoviedb.org/3/tv/popular?api_key={api_key}&language=zh-CN&region=CN&page={tv_page}",
            f"https://api.themoviedb.org/3/tv/top_rated?api_key={api_key}&language=zh-CN&region=CN&page=1",
            f"https://api.themoviedb.org/3/tv/on_the_air?api_key={api_key}&language=zh-CN&region=CN&page=1"
        ]
        
        all_tvs = []
        for url in tv_endpoints:
            try:
                response = requests.get(url, timeout=5)
                data = response.json()
                all_tvs.extend(data.get('results', []))
            except Exception as e:
                print(f"获取电视剧数据失败: {e}")
        
        # 随机打乱并选择电视剧
        if all_tvs:
            random.shuffle(all_tvs)
            tv_count = 0
            for tv in all_tvs:
                # 过滤不适合内容
                name = tv.get('name', '')
                overview = tv.get('overview', '')
                if tv.get('adult', False) or any(keyword in name.lower() or keyword in overview.lower() for keyword in adult_keywords):
                    continue
                    
                recommendations.append({
                    'name': name,
                    'type': 'tv',
                    'icon': 'tv',
                    'poster': f"https://image.tmdb.org/t/p/w300{tv.get('poster_path', '')}" if tv.get('poster_path') else None,
                    'rating': tv.get('vote_average', 0),
                    'year': tv.get('first_air_date', '')[:4] if tv.get('first_air_date') else ''
                })
                tv_count += 1
                if tv_count >= 5:  # 增加到5个电视剧
                    break
        
        # 最终随机打乱所有推荐
        if recommendations:
            random.shuffle(recommendations)
            recommendations = recommendations[:8]  # 限制为8个推荐，2行每行4个
        
        # 如果API调用失败，返回默认推荐
        if not recommendations:
            recommendations = [
                {'name': '流浪地球2', 'type': 'movie', 'icon': 'film', 'rating': 8.3, 'year': '2023'},
                {'name': '三体', 'type': 'tv', 'icon': 'tv', 'rating': 8.7, 'year': '2023'},
                {'name': '繁花', 'type': 'tv', 'icon': 'tv', 'rating': 8.1, 'year': '2024'},
                {'name': '年会不能停', 'type': 'movie', 'icon': 'film', 'rating': 7.8, 'year': '2023'},
                {'name': '长相思', 'type': 'tv', 'icon': 'tv', 'rating': 8.5, 'year': '2023'},
                {'name': '我本是高山', 'type': 'movie', 'icon': 'film', 'rating': 7.9, 'year': '2023'},
                {'name': '庆余年2', 'type': 'tv', 'icon': 'tv', 'rating': 8.2, 'year': '2024'},
                {'name': '涉过愤怒的海', 'type': 'movie', 'icon': 'film', 'rating': 7.6, 'year': '2023'}
            ]
        
        return jsonify({
            'status': 'success',
            'recommendations': recommendations,
            'source': 'TMDb API with hot reload'
        })
        
    except Exception as e:
        # 出错时返回默认推荐
        return jsonify({
            'status': 'success',
            'recommendations': [
                {'name': '流浪地球2', 'type': 'movie', 'icon': 'film', 'rating': 8.3, 'year': '2023'},
                {'name': '三体', 'type': 'tv', 'icon': 'tv', 'rating': 8.7, 'year': '2023'},
                {'name': '繁花', 'type': 'tv', 'icon': 'tv', 'rating': 8.1, 'year': '2024'},
                {'name': '年会不能停', 'type': 'movie', 'icon': 'film', 'rating': 7.8, 'year': '2023'},
                {'name': '长相思', 'type': 'tv', 'icon': 'tv', 'rating': 8.5, 'year': '2023'},
                {'name': '我本是高山', 'type': 'movie', 'icon': 'film', 'rating': 7.9, 'year': '2023'},
                {'name': '庆余年2', 'type': 'tv', 'icon': 'tv', 'rating': 8.2, 'year': '2024'},
                {'name': '涉过愤怒的海', 'type': 'movie', 'icon': 'film', 'rating': 7.6, 'year': '2023'}
            ]
        })

@app.route('/api/pan-status')
def api_pan_status():
    """
    获取百度网盘工具状态
    """
    try:
        auth_mgr = get_auth_manager()
        if not auth_mgr:
            return jsonify({
                "status": "error",
                "message": "BaiduPCS-Py库不可用",
                "version": "库未安装",
                "logged_in": False
            })
        
        # 检查是否有配置的账户
        current_account, api = auth_mgr.get_current_account()
        logged_in = api is not None
        
        # 如果有账户，测试连接
        if logged_in:
            success, _ = auth_mgr.test_account()
            logged_in = success
        
        return jsonify({
            "status": "ok",
            "version": "0.7.6",
            "logged_in": logged_in,
            "current_account": current_account,
            "message": "BaiduPCS-Py库可用"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"状态检查失败: {str(e)}",
            "version": "未知",
            "logged_in": False
        })

# 全局认证管理器
_auth_manager = None

def get_auth_manager():
    """获取认证管理器实例"""
    global _auth_manager
    if _auth_manager is None:
        try:
            from auth_manager import BaiduAuthManager
            _auth_manager = BaiduAuthManager()
        except ImportError:
            return None
    return _auth_manager

@app.route('/api/auth/status')
def api_auth_status():
    """
    检查BaiduPCS-Py认证状态
    """
    try:
        auth_mgr = get_auth_manager()
        if not auth_mgr:
            return jsonify({
                'current': {'configured': False, 'logged_in': False, 'message': 'BaiduPCS-Py库不可用'},
                'accounts': [],
                'library_available': False
            })
        
        accounts = auth_mgr.list_accounts()
        current_account, api = auth_mgr.get_current_account()
        
        # 测试当前账户
        if api:
            success, message = auth_mgr.test_account()
            current_status = {
                'configured': True,
                'logged_in': success,
                'current_user': current_account,
                'message': message
            }
        else:
            current_status = {
                'configured': False,
                'logged_in': False,
                'current_user': None,
                'message': '未配置用户认证'
            }
        
        return jsonify({
            'current': current_status,
            'accounts': list(accounts.keys()),
            'library_available': True
        })
    except Exception as e:
        return jsonify({
            'current': {'configured': False, 'logged_in': False, 'message': f'错误: {str(e)}'},
            'accounts': [],
            'library_available': False
        })

@app.route('/api/auth/add-user', methods=['POST'])
def api_add_user():
    """通过Web界面添加BaiduPCS用户"""
    try:
        auth_mgr = get_auth_manager()
        if not auth_mgr:
            return jsonify({
                'status': 'error',
                'message': 'BaiduPCS-Py库不可用'
            }), 500
        
        data = request.json
        bduss = data.get('bduss', '').strip()
        cookies = data.get('cookies', '').strip()
        account_name = data.get('account_name', '').strip()
        
        if not bduss or not cookies:
            return jsonify({
                'status': 'error', 
                'message': 'BDUSS和cookies不能为空'
            }), 400
        
        success, message = auth_mgr.add_user(bduss, cookies, account_name)
        return jsonify({
            'status': 'success' if success else 'error',
            'message': message
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'添加用户失败: {str(e)}'
        }), 500

@app.route('/api/auth/test-account', methods=['POST'])
def api_test_account():
    """测试指定账户"""
    try:
        auth_mgr = get_auth_manager()
        if not auth_mgr:
            return jsonify({
                'status': 'error',
                'message': 'BaiduPCS-Py库不可用'
            }), 500
        
        data = request.json
        account_name = data.get('account_name')
        
        success, message = auth_mgr.test_account(account_name)
        return jsonify({
            'status': 'success' if success else 'error',
            'message': message
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'测试失败: {str(e)}'
        }), 500

@app.route('/api/auth/quota', methods=['GET'])
def api_get_quota():
    """获取当前用户配额信息"""
    try:
        auth_mgr = get_auth_manager()
        if not auth_mgr:
            return jsonify({
                'status': 'error',
                'message': 'BaiduPCS-Py库不可用'
            }), 500
        
        quota = auth_mgr.get_quota_info()
        if quota:
            return jsonify({
                'status': 'success',
                'quota': {
                    'total': str(quota.get('quota_total', 0)),
                    'used': str(quota.get('quota_used', 0)),
                    'free': str(quota.get('quota_remain', 0))
                }
            })
        else:
            return jsonify({
                'status': 'error',
                'message': '未配置有效的账户'
            })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'获取配额失败: {str(e)}'
        }), 500

# 配置管理函数
CONFIG_FILE = 'config.json'

def get_config():
    """
    获取系统配置，优先读取本地配置文件，不存在则返回默认值
    """
    default_config = {
        "tmdb_api_key": "",
        "tmdb_language": "zh-CN", 
        "search_api_endpoint": "https://so.252035.xyz/api/search",
        "movie_path": MOVIE_PATH,
        "tv_path": TV_SHOW_PATH,
        "server_host": "0.0.0.0",
        "server_port": 5001,
        "debug_mode": True,
        "api_prefix": "/api",
        "max_logs": 500,
        "search_timeout": 30,
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        "custom_cookies": ""
    }
    
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
            # 合并默认配置，确保新添加的配置项有默认值
            default_config.update(config)
            return default_config
        except Exception as e:
            print(f"读取配置文件失败，使用默认配置: {e}")
            return default_config
    else:
        # 创建默认配置文件
        save_config(default_config)
        return default_config

def save_config(config):
    """
    保存配置到本地文件
    """
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存配置文件失败: {e}")
        return False

# 全局配置
config_data = get_config()

# 启动时间记录
import time
startup_time = time.time()

def format_datetime(datetime_str):
    """
    格式化日期时间字符串
    """
    try:
        # 尝试解析不同的日期时间格式
        for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%Y/%m/%d %H:%M:%S', '%Y/%m/%d']:
            try:
                dt = datetime.strptime(datetime_str, fmt)
                return dt.strftime('%Y-%m-%d %H:%M')
            except ValueError:
                continue
        return datetime_str
    except Exception:
        return datetime_str

def save_to_pan_api(shared_url, password, target_dir):
    """
    使用 BaiduPCS-Py 库将分享链接转存到指定目录
    """
    try:
        auth_mgr = get_auth_manager()
        if not auth_mgr:
            return "BaiduPCS-Py 库未安装"
        
        success, message = auth_mgr.save_to_pan(shared_url, password, target_dir)
        if success:
            return "转存成功"
        else:
            return f"转存失败: {message}"
            
    except Exception as e:
        return f"转存失败: {str(e)}"

@app.route('/api/search-only', methods=['POST'])
def api_search_only():
    """
    仅搜索资源，不执行转存操作
    """
    try:
        data = request.get_json()
        if not data or 'keyword' not in data:
            return jsonify({"status": "error", "message": "请求体中必须包含 'keyword' 字段。"}), 400
        
        keyword = data['keyword']
        search_results = search_media(keyword)
        
        if not search_results or not search_results.get('data', {}).get('merged_by_type', {}).get('baidu'):
            return jsonify({"status": "success", "results": [], "message": "未找到相关资源"})
        
        # 获取百度网盘搜索结果
        baidu_results = search_results['data']['merged_by_type']['baidu']
        
        # 增强搜索结果信息
        enhanced_results = []
        for result in baidu_results:
            # 解析标题和基本信息
            title = result.get('note', '').split('/')[0].strip()
            datetime_str = result.get('datetime', '')
            
            # 构建增强的结果对象
            enhanced_result = {
                'title': title,
                'full_note': result.get('note', ''),
                'datetime': datetime_str,
                'url': result.get('url', ''),
                'password': result.get('password', ''),
                'size': result.get('size', '未知大小'),
                'type': result.get('type', 'unknown'),
                'formatted_date': format_datetime(datetime_str) if datetime_str else '未知时间'
            }
            enhanced_results.append(enhanced_result)
        
        return jsonify({
            "status": "success", 
            "results": enhanced_results,
            "total": len(enhanced_results)
        })
        
    except Exception as e:
        logger.error(f"搜索失败: {e}")
        return jsonify({"status": "error", "message": f"搜索失败: {str(e)}"}), 500

@app.route('/api/top100')
def api_top100():
    """
    获取Top100影视榜单数据
    """
    try:
        year = request.args.get('year', '2025')
        
        # 验证年份参数
        if year not in ['2023', '2024', '2025']:
            return jsonify({"status": "error", "message": "年份参数无效"}), 400
        
        config = get_config()
        api_key = config.get('tmdb_api_key')
        if not api_key:
            return jsonify({"status": "error", "message": "TMDb API Key未配置"}), 500
        
        import requests
        
        # 获取电影数据
        movies = get_top_media_by_year(api_key, 'movie', year)
        
        # 获取电视剧数据
        tv_shows = get_top_media_by_year(api_key, 'tv', year)
        
        return jsonify({
            "status": "success",
            "year": year,
            "movies": movies[:50],  # 限制返回前50个
            "tv_shows": tv_shows[:50]  # 限制返回前50个
        })
        
    except Exception as e:
        logger.error(f"获取Top100数据失败: {e}")
        return jsonify({"status": "error", "message": "获取数据失败"}), 500

def get_top_media_by_year(api_key, media_type, year):
    """
    根据年份获取热门影视作品
    """
    try:
        # 不适合的内容关键词过滤
        adult_keywords = ['拔作', '成人', '18+', '限制级', 'adult', 'hentai', 'ecchi']
        
        # 构建API请求URL
        if media_type == 'movie':
            # 对于电影，使用多个端点获取更多数据
            endpoints = [
                f"https://api.themoviedb.org/3/discover/movie?api_key={api_key}&language=zh-CN&sort_by=popularity.desc&primary_release_year={year}&region=CN",
                f"https://api.themoviedb.org/3/movie/popular?api_key={api_key}&language=zh-CN&region=CN&page=1",
                f"https://api.themoviedb.org/3/movie/top_rated?api_key={api_key}&language=zh-CN&region=CN&page=1"
            ]
        else:
            # 对于电视剧，使用多个端点获取更多数据
            endpoints = [
                f"https://api.themoviedb.org/3/discover/tv?api_key={api_key}&language=zh-CN&sort_by=popularity.desc&first_air_date_year={year}&region=CN",
                f"https://api.themoviedb.org/3/tv/popular?api_key={api_key}&language=zh-CN&region=CN&page=1",
                f"https://api.themoviedb.org/3/tv/top_rated?api_key={api_key}&language=zh-CN&region=CN&page=1"
            ]
        
        all_media = []
        
        for url in endpoints:
            try:
                response = requests.get(url, timeout=10)
                data = response.json()
                results = data.get('results', [])
                
                for item in results:
                    # 过滤不适合内容
                    title = item.get('title') or item.get('name', '')
                    overview = item.get('overview', '')
                    
                    if item.get('adult', False) or any(keyword in title.lower() or keyword in overview.lower() for keyword in adult_keywords):
                        continue
                    
                    # 检查年份是否匹配
                    if media_type == 'movie':
                        release_date = item.get('release_date', '')
                        if release_date and release_date[:4] != year:
                            continue
                    else:
                        first_air_date = item.get('first_air_date', '')
                        if first_air_date and first_air_date[:4] != year:
                            continue
                    
                    # 构建媒体项
                    media_item = {
                        'name': title,
                        'type': media_type,
                        'rating': item.get('vote_average', 0),
                        'popularity': item.get('popularity', 0),
                        'poster_path': item.get('poster_path'),
                        'overview': item.get('overview', ''),
                        'id': item.get('id')
                    }
                    
                    all_media.append(media_item)
                    
            except Exception as e:
                logger.warning(f"获取{media_type}数据失败: {e}")
                continue
        
        # 按受欢迎程度排序并去重
        if all_media:
            # 按受欢迎程度排序
            all_media.sort(key=lambda x: x['popularity'], reverse=True)
            
            # 去重（基于名称）
            seen_names = set()
            unique_media = []
            for item in all_media:
                if item['name'] not in seen_names:
                    seen_names.add(item['name'])
                    unique_media.append(item)
            
            return unique_media
        
        return []
        
    except Exception as e:
        logger.error(f"获取{media_type}榜单数据失败: {e}")
        return []

if __name__ == "__main__":
    logger.info("启动网盘搜索转存系统...")
    logger.info(f"访问地址: http://localhost:{config_data['server_port']}")
    logger.info("支持路由: /, /history, /status, /config, /top100")
    logger.info("新增API:")
    logger.info("  POST /api/auth/add-user - 添加BaiduPCS认证")
    logger.info("  GET /api/auth/status    - 检查认证状态")
    logger.info("  POST /api/auth/test-connection - 测试连接")
    
    app.secret_key = 'bdpan-secret-key'
    # 禁用debug模式和reloader避免双进程问题
    app.run(host=config_data['server_host'], port=config_data['server_port'], debug=False, use_reloader=False)
