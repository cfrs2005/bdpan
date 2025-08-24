/**
 * BaiduPCS认证管理功能
 * 直接通过Web界面添加Cookie并配置用户认证
 */

// 认证管理器
const BaiduAuthManager = {
    
    // 刷新认证状态
    refreshAuthStatus: function() {
        $.ajax({
            url: '/api/auth/status',
            method: 'GET',
            success: function(data) {
                const statusEl = $('#auth-status');
                const current = data.current;
                
                if (current.logged_in) {
                    statusEl
                        .removeClass('bg-secondary bg-warning bg-danger')
                        .addClass('bg-success')
                        .text(`已配置：${current.current_user || '百度网盘'}`);
                } else if (current.configured) {
                    statusEl
                        .removeClass('bg-secondary bg-success bg-danger')
                        .addClass('bg-warning')
                        .text('登录失败');
                } else {
                    statusEl
                        .removeClass('bg-success bg-warning')
                        .addClass('bg-secondary')
                        .text('未配置');
                }
            },
            error: function() {
                $('#auth-status')
                    .removeClass('bg-success bg-warning')
                    .addClass('bg-danger')
                    .text('库不可用');
            }
        });
    },

    // 保存百度网盘认证
    saveBaiduAuth: function() {
        const cookies = $('#cookies-input').val().trim();
        const accountName = $('#account-name-input').val().trim();
        
        if (!cookies) {
            showConfigAlert('Cookie字符串不能为空！', 'warning');
            return;
        }
        
        showConfigAlert('正在添加百度网盘认证...', 'info');
        
        $.ajax({
            url: '/api/auth/add-user',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                bduss: cookies, // 传递完整cookie，后端会自动解析BDUSS
                cookies: cookies,
                account_name: accountName || '百度网盘'
            }),
            success: function(response) {
                if (response.status === 'success') {
                    showConfigAlert('认证添加成功！系统已自动提取BDUSS等必要信息', 'success');
                    BaiduAuthManager.refreshAuthStatus();
                    
                    // 清空输入框
                    $('#cookies-input').val('');
                    $('#account-name-input').val('');
                } else {
                    showConfigAlert(`认证失败: ${response.message}`, 'danger');
                }
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON?.message || '网络错误';
                showConfigAlert(`认证失败: ${errorMsg}`, 'danger');
            }
        });
    },

    // 测试当前账户
    testCurrentAccount: function() {
        showConfigAlert('正在测试当前账户...', 'info');
        
        $.ajax({
            url: '/api/auth/test-account',
            method: 'POST',
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: function(response) {
                if (response.status === 'success') {
                    showConfigAlert(response.message, 'success');
                } else {
                    showConfigAlert(response.message, 'warning');
                }
            },
            error: function() {
                showConfigAlert('测试失败：无法连接到服务器', 'danger');
            }
        });
    },

    // 获取配额信息
    getQuotaInfo: function() {
        $.ajax({
            url: '/api/auth/quota',
            method: 'GET',
            success: function(response) {
                if (response.status === 'success') {
                    const quota = response.quota;
                    showConfigAlert(`配额信息 - 总: ${quota.total}, 已用: ${quota.used}, 剩余: ${quota.free}`, 'info');
                } else {
                    showConfigAlert(`获取配额失败: ${response.message}`, 'warning');
                }
            },
            error: function() {
                showConfigAlert('获取配额失败：网络错误', 'danger');
            }
        });
    },

    // 显示Cookie获取指导
    showCookieGuide: function() {
        const guideHtml = `
            <div class="modal fade" id="cookieGuideModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">如何获取百度网盘Cookie</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h6>步骤1：登录百度网盘</h6>
                            <ol>
                                <li>用浏览器打开 pan.baidu.com</li>
                                <li>用手机扫描登录二维码并登录</li>
                            </ol>
                            
                            <h6>步骤2：获取Cookie</h6>
                            <ol>
                                <li>按F12打开开发者工具</li>
                                <li>切换到 Network 面板</li>
                                <li>刷新页面</li>
                                <li>选择任意一个请求</li>
                                <li>在 Headers 中找到 Request Headers</li>
                                <li>复制整个 Cookie 字段值</li>
                            </ol>
                            
                            <h6>步骤3：输入Cookie</h6>
                            <p>将复制的完整Cookie字符串粘贴到上方的"百度网盘Cookie"输入框中，系统会自动提取BDUSS等必要信息</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(guideHtml);
        const modal = new bootstrap.Modal($('#cookieGuideModal'));
        modal.show();
        
        // 清理modal元素
        $('#cookieGuideModal').on('hidden.bs.modal', function() {
            $(this).remove();
        });
    }
};

// 页面加载完成后的初始化
$(document).ready(function() {
    // 如果当前是配置页面，则初始化认证状态
    if ($('#cookies-input').length > 0) {
        BaiduAuthManager.refreshAuthStatus();
    }
});

// 将认证管理器暴露到全局作用域
window.BaiduAuthManager = BaiduAuthManager;

// 兼容旧函数名
function refreshAuthStatus() {
    BaiduAuthManager.refreshAuthStatus();
}

function saveBaiduAuth() {
    BaiduAuthManager.saveBaiduAuth();
}

function testCurrentAccount() {
    BaiduAuthManager.testCurrentAccount();
}

function showCookieGuide() {
    BaiduAuthManager.showCookieGuide();
}