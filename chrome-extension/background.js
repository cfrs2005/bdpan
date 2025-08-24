async function getApiEndpoint() {
  const result = await chrome.storage.sync.get(['apiEndpoint']);
  return result.apiEndpoint || 'http://localhost:5001/api/save';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveMovie") {
    getApiEndpoint().then(apiUrl => {
      const movieTitle = request.title;

      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keyword: movieTitle })
      })
      .then(response => {
        // 根据约定，只要API有响应（不论内容），就认为是成功
        if (response.ok) {
          return response.json(); // 尝试解析json，即使我们不直接用它的内容
        }
        throw new Error('网络响应失败。');
      })
      .then(data => {
        // 即使不检查data内容，这也确认了json是有效的
        sendResponse({ status: 'success' });
      })
      .catch(error => {
        console.error('调用后端API时出错:', error);
        sendResponse({ status: 'error', message: error.message });
      });      
    });

    // 返回 true 表示我们将异步地发送响应
    return true;
  }
});
