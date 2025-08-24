/**
 * BaiduPCS-Py配置管理功能
 * 提供指导用户正确配置命令行工具的功能
 */

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

    // 显示配置指导
    showBaiduPCSGuide: function() {
        const guideHtml = `
            <div class="modal fade" id="baidupcsGuideModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">BaiduPCS-Py 配置指南</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h6>在 Docker 容器中配置：</h6>
                            <ol>
                                <li><strong>进入容器：</strong><br>
                                    <code>docker-compose exec bdpan-search bash</code></li>
                                <li><strong>运行配置：</strong><br>
                                    <code>BaiduPCS-Py quota</code></li>
                                <li><strong>按提示登录：</strong><br>
                                    浏览器登录百度网盘，复制登录cookie</li>
                                <li><strong>验证配置：</strong><br>
                                    <code>BaiduPCS-Py quota</code></li>
                            </ol>
                            <hr>
                            <h6>在主机上配置：</h6>
                            <ol>
                                <li><strong>安装BaiduPCS-Py：</strong><br>
                                    <code>pip install BaiduPCS-Py</code></li>
                                <li><strong>首次运行：</strong><br>
                                    <code>BaiduPCS-Py quota</code></li>
                                <li><strong>验证测试：</strong><br>
                                    <code>BaiduPCS-Py quota</code></li>
                            </ol>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(guideHtml);
        const modal = new bootstrap.Modal($('#baidupcsGuideModal'));
        modal.show();
        
        // 清理modal元素
        $('#baidupcsGuideModal').on('hidden.bs.modal', function() {
            $(this).remove();
        });
    }
};

// 页面加载时初始化
$(document).ready(function() {
    // 检查BaiduPCS-Py配置
    BaiduPCSManager.checkBaiduPCSConfig();
    
    // 直接绑定事件（兼容旧代码）
    window.testBaiduPCS = BaiduPCSManager.testBaiduPCS;
    window.showBaiduPCSGuide = BaiduPCSManager.showBaiduPCSGuide;
});

// 将BaiduPCS管理对象暴露到全局作用域
window.BaiduPCSManager = BaiduPCSManager;