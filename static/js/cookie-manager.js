/**
 * BaiduPCS-Py配置管理功能
 * 提供指导用户配置命令行工具的功能
 */

// Cookie管理对象
const BaiduPCSManager = {
    
    // 检查BaiduPCS-Py配置状态
    checkBaiduPCSConfig: function() {
        $.ajax({
            url: '/api/check-cookie',
            method: 'GET',
            success: function(data) {
                const status = $('#cookie-status');
                
                if (data.tool_available && data.login_configured) {
                    status
                        .removeClass('bg-warning bg-danger')
                        .addClass('bg-success')
                        .text('已配置');
                } else if (data.tool_available && !data.login_configured) {
                    status
                        .removeClass('bg-success bg-danger')
                        .addClass('bg-warning')
                        .text('需登录');
                } else {
                    status
                        .removeClass('bg-success bg-warning')
                        .addClass('bg-danger')
                        .text('未安装');
                }
            },
            error: function() {
                $('#cookie-status')
                    .removeClass('bg-warning bg-success')
                    .addClass('bg-danger')
                    .text('检查失败');
            }
        });
    },

    // 测试BaiduPCS-Py工具
    testBaiduPCS: function() {
        if (window.showConfigAlert) {
            window.showConfigAlert('正在检查BaiduPCS-Py工具...', 'info');
        }
        
        $.ajax({
            url: '/api/test-baupcs',
            method: 'GET',
            success: function(response) {
                if (response.status === 'success') {
                    if (window.showConfigAlert) {
                        window.showConfigAlert('BaiduPCS-Py配置正常！', 'success');
                    }
                } else {
                    if (window.showConfigAlert) {
                        window.showConfigAlert('BaiduPCS-Py配置异常: ' + response.message, 'warning');
                    }
                }
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON?.message || '无法连接到BaiduPCS-Py工具';
                if (window.showConfigAlert) {
                    window.showConfigAlert('测试失败: ' + errorMsg, 'danger');
                }
            }
        });
    },

    // 测试Cookie状态
    testCookieStatus: function() {
        $.ajax({
            url: '/api/check-cookie',
            method: 'GET',
            success: function(data) {
                if (data.exists && data.has_content) {
                    $('#cookie-status')
                        .removeClass('bg-warning bg-danger')
                        .addClass('bg-success')
                        .text(`已保存（${data.size}字符）`);
                    
                    if (window.showConfigAlert) {
                        window.showConfigAlert('Cookie已保存且包含内容！', 'success');
                    }
                } else if (data.exists && !data.has_content) {
                    $('#cookie-status')
                        .removeClass('bg-success bg-danger')
                        .addClass('bg-warning')
                        .text('文件空');
                    
                    if (window.showConfigAlert) {
                        window.showConfigAlert('文件存在但为空，请添加内容', 'warning');
                    }
                } else {
                    $('#cookie-status')
                        .removeClass('bg-success bg-warning')
                        .addClass('bg-danger')
                        .text('未设置');
                    
                    if (window.showConfigAlert) {
                        window.showConfigAlert('Cookie未设置，请在下方输入', 'warning');
                    }
                }
            },
            error: function(xhr) {
                $('#cookie-status')
                    .removeClass('bg-success bg-warning')
                    .addClass('bg-danger')
                    .text('检查失败');
                
                if (window.showConfigAlert) {
                    window.showConfigAlert('Cookie验证失败: ' + xhr.status, 'danger');
                }
            }
        });
    },

    // 处理Cookie文件上传
    handleCookieFileUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'text/plain' && !file.name.toLowerCase().endsWith('.txt')) {
            if (window.showConfigAlert) {
                window.showConfigAlert('请选择文本文件', 'warning');
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                $('#cookie-content').val(content);
                
                if (window.showConfigAlert) {
                    window.showConfigAlert('Cookie文件已载入，请点击保存', 'info');
                }
                
                // 自动保存选项
                if (confirm('文件已加载，是否要立即保存？')) {
                    CookieManager.saveCookie();
                }
            } catch (error) {
                if (window.showConfigAlert) {
                    window.showConfigAlert('读取Cookie文件失败: ' + error.message, 'danger');
                }
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // 重置文件输入
    }
};

// 页面加载时初始化
$(document).ready(function() {
    // 如果在配置页面，加载Cookie内容
    if ($('#cookie-content').length > 0) {
        CookieManager.loadCookieContent();
    }
    
    // 绑定Cookie文件上传事件
    $('#cookie-upload').on('change', CookieManager.handleCookieFileUpload);
});

// 将Cookie管理对象暴露到全局作用域
window.CookieManager = CookieManager;