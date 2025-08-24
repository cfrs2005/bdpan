document.addEventListener('DOMContentLoaded', function() {
    const apiEndpointInput = document.getElementById('apiEndpoint');
    const serverUrlInput = document.getElementById('serverUrl');
    const serverPortInput = document.getElementById('serverPort');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const testBtn = document.getElementById('testBtn');
    const statusDiv = document.getElementById('status');

    const DEFAULT_ENDPOINT = 'http://localhost:5001/api/save';
    const DEFAULT_URL = 'localhost';
    const DEFAULT_PORT = '5001';

    // 初始化设置
    chrome.storage.sync.get(['apiEndpoint', 'serverUrl', 'serverPort'], function(items) {
        apiEndpointInput.value = items.apiEndpoint || DEFAULT_ENDPOINT;
        serverUrlInput.value = items.serverUrl || DEFAULT_URL;
        serverPortInput.value = items.serverPort || DEFAULT_PORT;
    });

    // 从服务器URL和端口合成API地址
    function updateApiEndpoint() {
        const url = serverUrlInput.value.trim() || DEFAULT_URL;
        const port = serverPortInput.value.trim() || DEFAULT_PORT;
        apiEndpointInput.value = `http://${url}:${port}/api/save`;
    }

    serverUrlInput.addEventListener('input', updateApiEndpoint);
    serverPortInput.addEventListener('input', updateApiEndpoint);

    // 显示状态信息
    function showStatus(message, isSuccess) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + (isSuccess ? 'success' : 'error');
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    // 保存设置
    saveBtn.addEventListener('click', function() {
        const newEndpoint = apiEndpointInput.value.trim();
        const newUrl = serverUrlInput.value.trim();
        const newPort = serverPortInput.value.trim();

        if (!newEndpoint) {
            showStatus('API地址不能为空！', false);
            return;
        }

        if (!newUrl) {
            showStatus('服务器地址不能为空！', false);
            return;
        }

        if (!newPort || isNaN(parseInt(newPort))) {
            showStatus('请输入有效的端口号！', false);
            return;
        }

        chrome.storage.sync.set({
            apiEndpoint: newEndpoint,
            serverUrl: newUrl,
            serverPort: newPort
        }, function() {
            showStatus('设置已保存！', true);
        });
    });

    // 恢复默认设置
    resetBtn.addEventListener('click', function() {
        apiEndpointInput.value = DEFAULT_ENDPOINT;
        serverUrlInput.value = DEFAULT_URL;
        serverPortInput.value = DEFAULT_PORT;
        
        chrome.storage.sync.set({
            apiEndpoint: DEFAULT_ENDPOINT,
            serverUrl: DEFAULT_URL,
            serverPort: DEFAULT_PORT
        }, function() {
            showStatus('已恢复默认设置！', true);
        });
    });

    // 测试连接
    testBtn.addEventListener('click', async function() {
        const endpoint = apiEndpointInput.value.trim();
        testBtn.disabled = true;
        testBtn.textContent = '测试中...';

        try {
            const response = await fetch(endpoint, {
                method: 'OPTIONS'
            });

            if (response.ok) {
                showStatus('连接成功！后端服务运行正常', true);
            } else {
                showStatus(`连接失败：HTTP ${response.status}`, false);
            }
        } catch (error) {
            showStatus(`连接失败：${error.message}`, false);
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = '测试连接';
        }
    });
});