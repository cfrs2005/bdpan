/*
 * 配置页面专用脚本 - 修正版
 * 解决函数未定义、作用域和语法错误
 */

// 确保在全局作用域定义所有函数
(function() {
    
    // 显示配置提示 - 修正的函数
    function showConfigAlert(message, type) {
        type = type || 'info';
        var alertClass = {
            'success': 'alert-success',
            'danger': 'alert-danger', 
            'warning': 'alert-warning',
            'info': 'alert-info'
        };
        
        var iconMap = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        
        var alertHtml = '<div class="alert ' + alertClass[type] + ' alert-dismissible fade show" role="alert">' +
            '<i class="fas fa-' + iconMap[type] + '"></i> ' + 
            $('<div>').text(message).html() + 
            '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>' +
            '</div>';
        
        $('#config-alerts').html(alertHtml);
        
        setTimeout(function() {
            $('#config-alerts .alert').fadeOut(function() {
                $(this).remove();
            });
        }, 5000);
    }

    // 切换密码可见性 - 修正的函数
    function togglePasswordVisibility(inputId) {
        var input = $('#' + inputId);
        var button = input.next().find('.fas');
        
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            button.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            input.attr('type', 'password');
            button.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    }

    // 测试Cookie状态 - 修正的函数
    function testCookieStatus() {
        showConfigAlert('正在检查Cookie文件...', 'info');
        
        $.ajax({
            url: '/api/check-cookie',
            method: 'GET',
            success: function(data) {
                if (data.exists) {
                    $('#cookie-status').removeClass('badge-warning badge-danger')
                        .addClass('badge bg-success').text('文件存在');
                    showConfigAlert('Cookie文件验证完成！', 'success');
                } else {
                    $('#cookie-status').removeClass('badge-success badge-danger')
                        .addClass('badge bg-warning').text('文件缺失');
                    showConfigAlert('Cookie文件不存在，请检查文件路径', 'warning');
                }
            },
            error: function(xhr) {
                $('#cookie-status').removeClass('badge-success badge-warning')
                    .addClass('badge bg-danger').text('检查失败');
                showConfigAlert('Cookie验证失败: ' + xhr.status, 'danger');
            }
        });
    }

    // 获取表单数据 - 修正的函数
    function getFormData() {
        return {
            tmdb_api_key: $('#tmdb-api-key').val() || '',
            tmdb_language: $('#tmdb-language').val() || 'zh-CN',
            search_api_endpoint: $('#search-api-endpoint').val() || '',
            movie_path: $('#movie-path').val() || '/我的资源/2025/电影',
            tv_path: $('#tv-path').val() || '/我的资源/2025/电视剧',
            server_host: $('#server-host').val() || '0.0.0.0',
            server_port: parseInt($('#server-port').val()) || 5001,
            debug_mode: $('#debug-mode').is(':checked'),
            api_prefix: $('#api-prefix').val() || '/api',
            max_logs: parseInt($('#max-logs').val()) || 500,
            search_timeout: parseInt($('#search-timeout').val()) || 30,
            user_agent: $('#user-agent').val() || '',
            custom_cookies: $('#custom-cookies').val() || ''
        };
    }

    // 加载配置 - 修正的函数
    var loadConfiguration = function() {
        if (!$('.nav-tabs').length) return;
        
        showConfigAlert('正在加载配置...', 'info');
        
        $.ajax({
            url: '/api/config',
            method: 'GET',
            success: function(config) {
                if (config && typeof config === 'object') {
                    $('#tmdb-api-key').val(config.tmdb_api_key || '');
                    $('#tmdb-language').val(config.tmdb_language || 'zh-CN');
                    $('#search-api-endpoint').val(config.search_api_endpoint || '');
                    $('#movie-path').val(config.movie_path || '/我的资源/2025/电影');
                    $('#tv-path').val(config.tv_path || '/我的资源/2025/电视剧');
                    $('#server-host').val(config.server_host || '0.0.0.0');
                    $('#server-port').val(config.server_port || 5001);
                    $('#debug-mode').prop('checked', Boolean(config.debug_mode));
                    $('#api-prefix').val(config.api_prefix || '/api');
                    $('#max-logs').val(config.max_logs || 500);
                    $('#search-timeout').val(config.search_timeout || 30);
                    $('#user-agent').val(config.user_agent || '');
                    $('#custom-cookies').val(config.custom_cookies || '');
                    
                    showConfigAlert('配置加载完成', 'success');
                } else {
                    showConfigAlert('加载配置失败：数据格式错误', 'danger');
                }
            },
            error: function(xhr) {
                console.error('配置加载错误:', xhr.statusText);
                showConfigAlert('加载配置失败: 服务器连接错误', 'danger');
            }
        });
    };

    // 保存配置 - 修正的函数
    var saveConfiguration = function() {
        if (!$('.nav-tabs').length) return;
        
        var formData = getFormData();
        
        showConfigAlert('正在保存配置...', 'info');
        
        $.ajax({
            url: '/api/config',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response && response.status === 'success') {
                    showConfigAlert('配置保存成功！重启后生效', 'success');
                } else {
                    showConfigAlert('保存失败: ' + (response.message || '未知错误'), 'danger');
                }
            },
            error: function(xhr) {
                var errorMsg = (xhr.responseJSON && xhr.responseJSON.message) || '服务器错误';
                showConfigAlert('保存失败: ' + errorMsg, 'danger');
            }
        });
    };

    // 绑定事件
    $(document).ready(function() {
        if (!$('.nav-tabs').length) return;
        
        loadConfiguration();
        
        // 表单变化监听
        $('input, select, textarea').on('change input', function() {
            saveConfiguration();
        });
        
        // 提交表单处理
        $('#config-form').on('submit', function(e) {
            e.preventDefault();
            saveConfiguration();
        });
        
        // 密码切换按钮
        $('[onclick*="togglePasswordVisibility"]').removeAttr('onclick').on('click', function() {
            var inputId = $(this).attr('onclick') ? 
                $(this).attr('onclick').match(/'([^']*)'/)[1] : 
                $(this).closest('.input-group').find('input[type="password"]').attr('id');
            togglePasswordVisibility(inputId || 'tmdb-api-key');
        });
    });

    // 确保函数在全局作用域
    window.showConfigAlert = showConfigAlert;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.testCookieStatus = testCookieStatus;
    window.getFormData = getFormData;
    window.loadConfiguration = loadConfiguration;
    window.saveConfiguration = saveConfiguration;

})();

// 修复重复加载的问题

// Cookie管理相关函数

// 加载Cookie内容
function loadCookieContent() {
    $.ajax({
        url: '/api/check-cookie',
        method: 'GET',
        success: function(data) {
            if (data.exists && data.content) {
                $('#cookie-content').val(data.content);
                $('#cookie-status')
                    .removeClass('bg-warning bg-danger')
                    .addClass('bg-success')
                    .text(`已保存（${data.size}字符）`);
            } else {
                $('#cookie-content').val('');
                $('#cookie-status')
                    .removeClass('bg-success bg-danger')
                    .addClass('bg-warning')
                    .text(data.exists ? '文件空' : '待设置');
            }
        },
        error: function() {
            $('#cookie-status')
                .removeClass('bg-warning bg-success')
                .addClass('bg-danger')
                .text('读取失败');
        }
    });
}

// 保存Cookie内容
function saveCookie() {
    const cookieContent = $('#cookie-content').val().trim();
    
    if (!cookieContent) {
        if (confirm('Cookie内容为空，确定要保存为空吗？')) {
            // 继续保存空cookie
        } else {
            return;
        }
    }

    showConfigAlert('正在保存Cookie...', 'info');
    
    $.ajax({
        url: '/api/save-cookie',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ cookie: cookieContent }),
        success: function(response) {
            if (response.status === 'success') {
                showConfigAlert('Cookie保存成功！', 'success');
                $('#cookie-status')
                    .removeClass('bg-warning bg-danger')
                    .addClass('bg-success')
                    .text(`已保存（${response.size}字符）`);
            } else {
                showConfigAlert('保存失败: ' + response.message, 'danger');
            }
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON?.message || '网络错误';
            showConfigAlert('Cookie保存失败: ' + errorMsg, 'danger');
        }
    });
}

// 处理Cookie文件上传
function handleCookieFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.toLowerCase().endsWith('.txt')) {
        showConfigAlert('请选择文本文件', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            $('#cookie-content').val(content);
            showConfigAlert('Cookie文件已载入，请点击保存', 'info');
            
            // 自动保存选项
            if (confirm('文件已加载，是否要自动保存？')) {
                saveCookie();
            }
        } catch (error) {
            showConfigAlert('读取Cookie文件失败: ' + error.message, 'danger');
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // 重置文件输入
}

// 页面加载时初始化Cookie功能
$(document).ready(function() {
    // 如果在配置页面，加载Cookie内容
    if ($('#cookie-content').length > 0) {
        loadCookieContent();
    }
});

// 将Cookie管理函数暴露到全局
window.saveCookie = saveCookie;
window.loadCookieContent = loadCookieContent;
window.handleCookieFileUpload = handleCookieFileUpload;