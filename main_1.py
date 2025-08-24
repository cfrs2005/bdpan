import requests
import json
import os
import subprocess
import traceback
from tmdbv3api import TMDb, Search
from flask import Flask, request, jsonify

# 从 docs/require.md 中获取的 TMDb API Key
TMDB_API_KEY = "04f3d954e65c4598b6863fee20fff697"

# 电影和电视剧在网盘中的存储路径
MOVIE_PATH = "/我的资源/2025/电影"
TV_SHOW_PATH = "/我的资源/2025/电视剧"

def get_cookies_from_file(file_path="cookie.txt"):
    """
    从文件中读取 cookie。
    注意：此函数现在只验证文件存在性，因为 BaiduPCS-Py 工具会自己读取 cookie。
    """
    if not os.path.exists(file_path):
        print(f"错误: Cookie 文件未找到 at {file_path}")
        return False
    return True

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
        print(f"搜索请求失败: {e}")
        return None

def get_media_type(title):
    """
    使用 TMDb API 判断是电影还是电视剧。
    """
    try:
        # --- Start Debug Logging ---
        print("\n[DEBUG] Manually fetching TMDb data for analysis...")
        movie_search_url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={title}&language=zh-CN"
        tv_search_url = f"https://api.themoviedb.org/3/search/tv?api_key={TMDB_API_KEY}&query={title}&language=zh-CN"

        print(f"[DEBUG] Movie Search URL: {movie_search_url}")
        movie_response = requests.get(movie_search_url)
        movie_data = movie_response.json()
        print("[DEBUG] TMDb Movie Search Raw Response:")
        print(json.dumps(movie_data, indent=2, ensure_ascii=False))

        print(f"[DEBUG] TV Search URL: {tv_search_url}")
        tv_response = requests.get(tv_search_url)
        tv_data = tv_response.json()
        print("[DEBUG] TMDb TV Search Raw Response:")
        print(json.dumps(tv_data, indent=2, ensure_ascii=False))
        print("[DEBUG] --- End Debug Logging ---\n")
        # --- End Debug Logging ---

        tmdb = TMDb()
        tmdb.api_key = TMDB_API_KEY
        tmdb.language = 'zh-CN'
        
        search = Search()

        search_movie = search.movies(title)
        search_tv = search.tv_shows(title)

        movie_results = search_movie.results
        tv_results = search_tv.results

        movie_popularity = movie_results[0].popularity if movie_results else 0
        tv_popularity = tv_results[0].popularity if tv_results else 0

        if movie_popularity > tv_popularity:
            return 'movie'
        elif tv_popularity > 0:
            return 'tv'
        else:
            return None
    except Exception as e:
        print(f"TMDb API 请求失败: {e}")
        print("--- Traceback ---")
        traceback.print_exc()
        print("-----------------")
        return None


if __name__ == "__main__":
    print(get_media_type("藏海传"))
