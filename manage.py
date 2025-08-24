import os
import sys
from flask import Flask, render_template, request, jsonify, redirect, url_for
from pathlib import Path
from config import config

# 设置模板目录
template_dir = Path(__file__).parent / "templates"
app = Flask(__name__, template_folder=template_dir)

@app.route('/manage')
def manage():
    """管理界面主页"""
    app_config = {
        'host': config.get('host', '0.0.0.0'),
        'port': config.get('port', 5051),
        'movie_path': config.get('movie_path', '/我的资源/2025/电影'),
        'tv_path': config.get('tv_path', '/我的资源/2025/电视剧'),
        'tmdb_api_key': config.get('tmdb_api_key', ''),
    }
    return render_template('manage.html', **app_config)

@app.route('/api/config', methods=['GET'])
def get_config():
    """获取所有配置"""
    try:
        app_config = config.get_all_config()
        # 处理敏感信息
        if 'cookie' in app_config:
            cookie = app_config['cookie']
            if cookie and len(cookie) > 32:
                app_config['cookie_masked'] = cookie[:20] + "..." + cookie[-10:]
            else:
                app_config['cookie_masked'] = "未设置或无效"
        
        return jsonify({
            'status': 'success',
            'data': app_config
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/config', methods=['POST'])
def update_config():
    """更新配置"""
    try:
        data = request.json
        
        # 更新配置
        for key, value in data.items():
            if key in ['host', 'port', 'movie_path', 'tv_path', 'tmdb_api_key', 'cookie']:
                try:
                    if key == 'port':
                        value = int(value)
                    config.set(key, value)
                except ValueError as e:
                    return jsonify({
                        'status': 'error',
                        'message': f'参数 {key} 格式错误: {e}'
                    }), 400
        
        return jsonify({
            'status': 'success',
            'message': '配置已保存'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/test-baidsu', methods=['POST'])
def test_baidu():
    """测试百度PCS连接"""
    import subprocess
    import tempfile
    import os
    
    try:
        cookie_file = config.get_cookie_path()
        
        if not os.path.exists(cookie_file):
            return jsonify({
                'status': 'error',
                'message': 'Cookie 文件不存在，请先设置百度cookie'
            })
        
        # 创建临时文件保存测试配置
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            cookie = config.get('cookie', '')
            f.write(cookie)
            temp_cookie = f.name
        
        try:
            # 检查BaiduPCS-Py是否安装
            result = subprocess.run(['BaiduPCS-Py', 'quota'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                return jsonify({
                    'status': 'success',
                    'message': '百度PCS连接成功'
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': '连接失败: ' + result.stderr
                })
                
        except subprocess.TimeoutExpired:
            return jsonify({
                'status': 'error',
                'message': '连接超时，请检查网络和网络代理设置'
            })
        except FileNotFoundError:
            return jsonify({
                'status': 'error',
                'message': 'BaiduPCS-Py 未安装，请运行: pip install BaiduPCS-Py'
            })
        finally:
            # 清理临时文件
            if os.path.exists(temp_cookie):
                os.unlink(temp_cookie)
                
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'测试失败: {str(e)}'
        })

@app.route('/api/test-tmdb', methods=['POST'])
def test_tmdb():
    """测试TMDb API连接"""
    import requests
    
    try:
        tmdb_key = config.get('tmdb_api_key', '')
        if not tmdb_key:
            return jsonify({
                'status': 'error',
                'message': 'TMDb API密钥未设置'
            })
        
        # 测试API连接
        url = f"https://api.themoviedb.org/3/search/movie?api_key={tmdb_key}&query=test"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            return jsonify({
                'status': 'success',
                'message': 'TMDb API连接成功'
            })
        elif response.status_code == 401:
            return jsonify({
                'status': 'error',
                'message': 'API密钥无效'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'请求失败，状态码: {response.status_code}'
            })
            
    except requests.RequestException as e:
        return jsonify({
            'status': 'error',
            'message': f'网络错误: {str(e)}'
        })

if __name__ == '__main__':
    port = config.get('port', 5052)
    host = config.get('host', '0.0.0.0')
    
    print(f"管理界面运行在 http://{host}:{port}/manage")
    app.run(host=host, port=port, debug=True)