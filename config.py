import os
import json
from pathlib import Path

class ConfigManager:
    def __init__(self, config_dir="config"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(exist_ok=True)
        self.config_file = self.config_dir / "settings.json"
        self.cookie_file = self.config_dir / "cookie.txt"
        self.load_config()
        
    def load_config(self):
        """加载配置文件"""
        default_config = {
            "api_key": "",
            "cookie": "",
            "movie_path": "/我的资源/2025/电影",
            "tv_path": "/我的资源/2025/电视剧",
            "tmdb_api_key": "",
            "port": 5051,
            "host": "0.0.0.0"
        }
        
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                    self.config = {**default_config, **loaded_config}
            except json.JSONDecodeError:
                self.config = default_config
        else:
            self.config = default_config
            self.save_config()
    
    def save_config(self):
        """保存配置文件"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            
            # 保存cookie到单独文件
            if self.config.get("cookie"):
                with open(self.cookie_file, 'w', encoding='utf-8') as f:
                    f.write(self.config["cookie"])
            
            return True
        except Exception as e:
            print(f"保存配置失败: {e}")
            return False
    
    def get(self, key, default=None):
        """获取配置值"""
        return self.config.get(key, default)
    
    def set(self, key, value):
        """设置配置值"""
        self.config[key] = value
        return self.save_config()
    
    def get_api_key(self):
        """获取API key，优先使用环境变量"""
        return os.getenv("TMDB_API_KEY", self.config.get("tmdb_api_key", ""))
    
    def get_cookie_path(self):
        """获取cookie文件路径"""
        return str(self.cookie_file)
    
    def get_all_config(self):
        """获取所有配置"""
        return self.config.copy()

# 全局配置实例
config = ConfigManager()