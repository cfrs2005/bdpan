function getMovieTitle() {
  const titleElement = document.querySelector('h1 span[property="v:itemreviewed"]');
  if (titleElement) {
    // 提取主要标题，移除年份等括号内容
    return titleElement.textContent.replace(/\s*\(\d{4}\)\s*/, '').trim();
  }
  return null;
}

function addButton() {
  const targetContainer = document.querySelector('.a_stars'); // 修正选择器为 .a_stars
  if (!targetContainer) {
    // 这个日志现在只在轮询最终失败时才重要
    return false;
  }

  // 检查按钮是否已存在，避免重复添加
  if (document.getElementById('douban-helper-btn')) {
    return true;
  }

  const addLibraryButton = document.createElement('a');
  addLibraryButton.id = 'douban-helper-btn'; // 为按钮添加ID以便检查
  addLibraryButton.href = 'javascript:void(0)';
  addLibraryButton.className = 'j a_show_login colbutt ll'; // 模仿豆瓣的按钮样式
  addLibraryButton.textContent = '📥 添加入库';
  addLibraryButton.style.marginLeft = '10px';

  targetContainer.appendChild(addLibraryButton);

  addLibraryButton.addEventListener('click', () => {
    const movieTitle = getMovieTitle();
    if (movieTitle) {
      addLibraryButton.textContent = '⏳ 正在入库...';
      addLibraryButton.style.pointerEvents = 'none'; // 防止重复点击

      chrome.runtime.sendMessage({ action: "saveMovie", title: movieTitle }, (response) => {
        if (response && response.status === 'success') {
          addLibraryButton.textContent = '✅ 已入库';
        } else {
          addLibraryButton.textContent = '❌ 入库失败';
          addLibraryButton.style.pointerEvents = 'auto'; // 失败后允许重试
        }
      });
    } else {
      alert('未能获取到电影标题。');
    }
  });

  return true; // 表示成功添加
}

// 使用轮询机制来等待目标元素出现
const maxTries = 50; // 最多尝试50次 (50 * 200ms = 10秒)
let currentTry = 0;

const intervalId = setInterval(() => {
  if (addButton()) {
    // 如果按钮成功添加，则清除定时器
    clearInterval(intervalId);
  } else if (++currentTry >= maxTries) {
    // 如果超过最大尝试次数，也清除定时器
    clearInterval(intervalId);
    console.log('豆瓣入库助手：超时，未找到按钮容器。');
  }
}, 200);
