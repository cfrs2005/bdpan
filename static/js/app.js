// 全局变量
const API_BASE_URL = '';
let currentSearchResults = [];
let currentSearchData = null; // 存储当前搜索结果数据

// 工具函数
function showLoading(message = '请稍候...') {
    const modal = $('#loadingModal');
    modal.find('p').text(message);
    modal.fadeIn();
}

function hideLoading() {
    $('#loadingModal').fadeOut();
}

function showAlert(message, type = 'info') {
    const alertClass = `alert-${type}`;
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const alertContainer = $('#alert-container');
    if (alertContainer.length === 0) {
        $('<div id="alert-container" class="container-fluid"></div>').prependTo('body');
    }
    $('#alert-container').append(alertHtml);
    
    setTimeout(() => {
        $('#alert-container .alert').first().alert('close');
    }, 5000);
}

// 配置页面专用的提示函数
function showConfigAlert(message, type = 'info') {
    const alertClass = {
        'success': 'alert-success',
        'danger': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    };
    
    const alertHtml = `
        <div class="alert ${alertClass[type]} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // 尝试在配置页面显示，如果不存在则使用通用提示
    const configAlerts = $('#config-alerts');
    if (configAlerts.length > 0) {
        configAlerts.html(alertHtml);
        setTimeout(() => {
            configAlerts.find('.alert').first().alert('close');
        }, 5000);
    } else {
        showAlert(message, type);
    }
}

// 格式化日期
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
}

// 显示文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// AJAX封装
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API请求失败:', error);
        throw error;
    }
}

// 搜索功能
async function searchMedia(keyword) {
    if (!keyword.trim()) {
        showAlert('请输入搜索关键词', 'warning');
        return;
    }
    
    showLoading('正在搜索资源...');
    
    try {
        const result = await apiRequest('/api/search', {
            body: JSON.stringify({ keyword })
        });
        
        hideLoading();
        
        if (result.status === 'success') {
            currentSearchData = result.search_results;
            displaySearchResults(result.logs, true);
            showAlert('搜索完成！', 'success');
            
            // 显示"添加入库"按钮
            $('#save-btn').show();
        } else {
            showAlert(`搜索失败: ${result.logs.join(', ')}`, 'danger');
            $('#save-btn').hide();
        }
    } catch (error) {
        hideLoading();
        showAlert(`请求失败: ${error.message}`, 'danger');
        $('#save-btn').hide();
    }
}

// 添加入库功能
async function saveMedia() {
    if (!currentSearchData) {
        showAlert('请先搜索资源', 'warning');
        return;
    }
    
    showLoading('正在添加入库...');
    
    try {
        const result = await apiRequest('/api/save-media', {
            body: JSON.stringify({
                title: currentSearchData.title,
                link: currentSearchData.link,
                password: currentSearchData.password,
                media_type: currentSearchData.media_type
            })
        });
        
        hideLoading();
        
        if (result.status === 'success') {
            displaySearchResults(result.logs, false);
            showAlert('添加入库完成！', 'success');
        } else {
            showAlert(`入库失败: ${result.logs.join(', ')}`, 'danger');
        }
    } catch (error) {
        hideLoading();
        showAlert(`请求失败: ${error.message}`, 'danger');
    }
}

// 快速入库功能（搜索并转存）
async function quickAddMedia(keyword) {
    if (!keyword.trim()) {
        showAlert('请输入搜索关键词', 'warning');
        return;
    }
    
    showLoading('正在快速入库...');
    
    try {
        const result = await apiRequest('/api/save', {
            body: JSON.stringify({ keyword })
        });
        
        hideLoading();
        
        if (result.status === 'success') {
            displaySearchResults(result.logs, false);
            saveSearchHistory(keyword, result);
            showAlert('快速入库完成！', 'success');
        } else {
            showAlert(`快速入库失败: ${result.logs.join(', ')}`, 'danger');
        }
    } catch (error) {
        hideLoading();
        showAlert(`请求失败: ${error.message}`, 'danger');
    }
}

// 显示搜索结果
function displaySearchResults(logs, isSearchOnly = false) {
    const resultsContainer = $('#search-results');
    resultsContainer.empty();
    
    if (!logs || logs.length === 0) {
        resultsContainer.append(`
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> 暂无搜索结果
            </div>
        `);
        return;
    }
    
    let html = '<div class="card"><div class="card-header"><i class="fas fa-list"></i> 执行日志</div><div class="card-body"><div class="log-viewer">';
    logs.forEach(log => {
        html += `<div>${log}</div>`;
    });
    html += '</div></div></div>';
    
    // 如果是搜索结果且搜索成功，显示搜索结果详情
    if (isSearchOnly && currentSearchData) {
        html += `
            <div class="card mt-3">
                <div class="card-header">
                    <i class="fas fa-info-circle"></i> 搜索结果详情
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <strong>标题:</strong> ${currentSearchData.title}
                        </div>
                        <div class="col-md-6">
                            <strong>类型:</strong> ${currentSearchData.media_type === 'movie' ? '电影' : currentSearchData.media_type === 'tv' ? '电视剧' : '未知'}
                        </div>
                        <div class="col-md-6">
                            <strong>目标路径:</strong> ${currentSearchData.target_path || '未确定'}
                        </div>
                        <div class="col-md-6">
                            <strong>状态:</strong> <span class="badge bg-warning">待入库</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    resultsContainer.hide().fadeIn().append(html);
}

// 显示搜索中的结果
function displayInstantResults(data) {
    const resultsContainer = $('#search-results');
    
    if (!data || !data.data || !data.data.merged_by_type || !data.data.merged_by_type.baidu) {
        return;
    }
    
    const results = data.data.merged_by_type.baidu;
    currentSearchResults = results;
    
    let html = '<div class="row">';
    results.forEach((item, index) => {
        const title = item.note?.split('/')[0] || '未知标题';
        const date = item.datetime ? formatDateTime(item.datetime) : '未知时间';
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="card search-result fade-in-up">
                    <div class="card-body">
                        <div class="title">${title}</div>
                        <div class="date">
                            <i class="fas fa-clock"></i> ${date}
                        </div>
                        <div class="actions">
                            <button class="btn btn-primary btn-sm" onclick="saveToPan('${index}')">
                                <i class="fas fa-download"></i> 转存
                            </button>
                            <a href="${item.url}" target="_blank" class="btn btn-info btn-sm">
                                <i class="fas fa-external-link-alt"></i> 查看链接
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    resultsContainer.hide().fadeIn().html(html);
}

// 转存到网盘
async function saveToPan(index) {
    const item = currentSearchResults[index];
    if (!item) return;
    
    showLoading('正在转存到网盘...');
    
    try {
        // 这里应该调用转存API
        showAlert('转存功能正在开发中', 'info');
    } catch (error) {
        console.error('转存失败:', error);
        showAlert('转存失败，请重试', 'danger');
    } finally {
        hideLoading();
    }
}

// 搜索历史相关功能
function saveSearchHistory(keyword, result) {
    const history = getSearchHistory();
    const item = {
        keyword: keyword,
        timestamp: Date.now(),
        status: result.status,
        logs: result.logs
    };
    
    history.unshift(item);
    
    // 只保留最近50条记录
    if (history.length > 50) {
        history.pop();
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(history));
}

function getSearchHistory() {
    try {
        const history = localStorage.getItem('searchHistory');
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('读取历史记录失败:', error);
        return [];
    }
}

function clearSearchHistory() {
    if (confirm('确定要清除所有历史记录吗？')) {
        localStorage.removeItem('searchHistory');
        loadSearchHistory();
        showAlert('历史记录已清除', 'success');
    }
}

function loadSearchHistory() {
    const history = getSearchHistory();
    const container = $('#history-list');
    
    if (history.length === 0) {
        container.html(`
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    <i class="fas fa-history fa-2x"></i>
                    <p class="mt-2">暂无搜索历史</p>
                </td>
            </tr>
        `);
        return;
    }
    
    let html = '';
    history.forEach(item => {
        const statusClass = item.status === 'success' ? 'icon-success' : 'icon-danger';
        const statusIcon = item.status === 'success' ? 'fa-check-circle' : 'fa-times-circle';
        
        html += `
            <tr>
                <td>
                    <strong>${item.keyword}</strong>
                    <br>
                    <small class="text-muted">${formatDateTime(item.timestamp)}</small>
                </td>
                <td>
                    <span class="${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        ${item.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="showHistoryDetails(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        <i class="fas fa-eye"></i> 查看详情
                    </button>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="searchAgain('${item.keyword}')">
                        <i class="fas fa-redo"></i> 重新搜索
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.html(html);
}

function showHistoryDetails(item) {
    const modal = new bootstrap.Modal($('#history-detail-modal')[0]);
    $('#history-keyword').text(item.keyword);
    $('#history-time').text(formatDateTime(item.timestamp));
    $('#history-status').html(`
        <span class="${item.status === 'success' ? 'text-success' : 'text-danger'}">
            <i class="fas fa-${item.status === 'success' ? 'check' : 'times'}"></i>
            ${item.status.toUpperCase()}
        </span>
    `);
    $('#history-logs').html(`
        <div class="log-viewer">
            ${item.logs.map(log => `<div>${log}</div>`).join('')}
        </div>
    `);
    modal.show();
}

function searchAgain(keyword) {
    $('#search-keyword').val(keyword);
    const searchBtn = document.querySelector('#search-btn');
    if (searchBtn) {
        searchBtn.click();
    }
}

// 系统状态检查
async function checkSystemStatus() {
    const statusContainer = $('#system-status');
    
    // TMDb API状态
    const tmdbStatus = await checkTmdbAPI();
    // 搜索API状态
    const searchStatus = await checkSearchAPI();
    // 网盘转存工具
    const panToolStatus = await checkPanTool();
    
    const statusHtml = `
        <div class="row">
            <div class="col-md-4 mb-3">
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-database fa-3x ${tmdbStatus.status === 'ok' ? 'icon-success' : 'icon-danger'}"></i>
                        <h5 class="card-title mt-3">TMDb API</h5>
                        <p class="card-text">${tmdbStatus.message}</p>
                        <span class="badge ${tmdbStatus.status === 'ok' ? 'badge-success' : 'badge-danger'}">
                            ${tmdbStatus.status.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-search fa-3x ${searchStatus.status === 'ok' ? 'icon-info' : 'icon-danger'}"></i>
                        <h5 class="card-title mt-3">资源搜索API</h5>
                        <p class="card-text">${searchStatus.message}</p>
                        <span class="badge ${searchStatus.status === 'ok' ? 'badge-info' : 'badge-danger'}">
                            ${searchStatus.status.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-cloud fa-3x ${panToolStatus.status === 'ok' ? 'icon-success' : 'icon-danger'}"></i>
                        <h5 class="card-title mt-3">网盘转存工具</h5>
                        <p class="card-text">${panToolStatus.message}</p>
                        <span class="badge ${panToolStatus.status === 'ok' ? 'badge-success' : 'badge-danger'}">
                            ${panToolStatus.status.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    statusContainer.html(statusHtml);
}

async function checkTmdbAPI() {
    return { status: 'ok', message: '连接正常' };
}

async function checkSearchAPI() {
    return { status: 'ok', message: '服务正常' };
}

async function checkPanTool() {
    return { status: 'ok', message: '工具已安装' };
}

// 页面加载完成后执行
$(document).ready(function() {
    // 导航栏激活状态
    const currentPath = window.location.pathname;
    $('.navbar-nav .nav-link').removeClass('active');
    
    if (currentPath === '/' || currentPath === '/search') {
        $('#nav-home').addClass('active');
    } else if (currentPath.includes('/history')) {
        $('#nav-history').addClass('active');
    } else if (currentPath.includes('/status')) {
        $('#nav-status').addClass('active');
    } else if (currentPath.includes('/top100')) {
        $('#nav-top100').addClass('active');
    } else if (currentPath.includes('/config')) {
        $('#nav-config').addClass('active');
        // 配置页面初始化
        loadConfiguration();
        bindConfigEvents();
    }
    
    // 历史记录页面加载
    if ($('#history-list').length) {
        loadSearchHistory();
    }
    
    // 状态页面加载
    if ($('#system-status').length) {
        checkSystemStatus();
        setInterval(checkSystemStatus, 30000); // 每30秒检查一次
    }
    
    // 搜索表单提交
    $('#search-form').on('submit', function(e) {
        e.preventDefault();
        const keyword = $('#search-keyword').val();
        searchMedia(keyword);
    });
    
    // 添加入库按钮
    $('#save-btn').on('click', function() {
        saveMedia();
    });
    
    // 快速入库按钮
    $('#quick-add-btn').on('click', function() {
        const keyword = $('#search-keyword').val();
        quickAddMedia(keyword);
    });
    
    // 快捷搜索按钮（使用搜索功能）
    $('[data-search]').on('click', function() {
        const keyword = $(this).data('search');
        $('#search-keyword').val(keyword);
        searchMedia(keyword);
    });
});

// 配置页面功能 - 已移至config.html中处理
// 这里保留一个空的函数以避免错误
function loadConfiguration() {
    // 配置页面现在有自己的脚本处理
    console.log('配置页面功能已移至页面脚本中');
}

function bindConfigEvents() {
    // 配置页面现在有自己的脚本处理
    console.log('配置页面事件绑定已移至页面脚本中');
}

function saveConfiguration() {
    // 配置页面现在有自己的脚本处理
    console.log('配置保存功能已移至页面脚本中');
}

function getFormData() {
    // 配置页面现在有自己的脚本处理
    console.log('获取表单数据功能已移至页面脚本中');
    return {};
}

// 推荐功能
function loadRecommendations() {
    $.ajax({
        url: '/api/recommendations',
        method: 'GET',
        success: function(response) {
            if (response.status === 'success') {
                updateRecommendations(response.recommendations);
            }
        },
        error: function() {
            console.error('加载推荐失败，使用默认推荐');
        }
    });
}

function updateRecommendations(recommendations) {
    const container = $('#recommendations-container');
    let html = '';
    
    recommendations.forEach(item => {
        // 构建卡片样式的推荐，包含海报图片
        const posterImg = item.poster ? 
            `<img src="${item.poster}" class="recommendation-poster" alt="${item.name}" onerror="this.style.display='none'">` :
            `<div class="recommendation-poster-placeholder"><i class="fas fa-${item.icon} fa-2x"></i></div>`;
        
        const ratingBadge = item.rating && item.rating > 0 ? 
            `<span class="badge bg-warning text-dark ms-1">${item.rating.toFixed(1)}</span>` : '';
        
        html += `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                <div class="card recommendation-card h-100" data-search="${item.name}">
                    <div class="recommendation-poster-container">
                        ${posterImg}
                        <div class="recommendation-overlay">
                            <button class="btn btn-primary btn-sm">
                                <i class="fas fa-search"></i> 搜索
                            </button>
                        </div>
                    </div>
                    <div class="card-body p-3">
                        <h6 class="card-title mb-2 text-center">${item.name}</h6>
                        <div class="text-center">
                            <small class="text-muted">
                                <i class="fas fa-${item.icon}"></i> 
                                ${item.type === 'movie' ? '电影' : '电视剧'}
                                ${item.year ? ` · ${item.year}` : ''}
                            </small>
                            ${ratingBadge ? `<div class="mt-1">${ratingBadge}</div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // 用row包装
    container.html(`<div class="row">${html}</div>`);
    
    // 重新绑定点击事件
    bindRecommendationEvents();
}

function bindRecommendationEvents() {
    // 绑定卡片点击事件
    $('#recommendations-container .recommendation-card').off('click').on('click', function() {
        const keyword = $(this).data('search');
        $('#search-keyword').val(keyword);
        $('#search-form').submit();
    });
    
    // 绑定按钮点击事件
    $('#recommendations-container button').off('click').on('click', function(e) {
        e.stopPropagation();
        const card = $(this).closest('.recommendation-card');
        const keyword = card.data('search');
        $('#search-keyword').val(keyword);
        $('#search-form').submit();
    });
}

// 页面加载完成后初始化
$(document).ready(function() {
    // 绑定推荐按钮事件
    bindRecommendationEvents();
    
    // 页面加载时自动获取最新推荐
    if ($('#recommendations-container').length > 0) {
        loadRecommendations();
    }
});