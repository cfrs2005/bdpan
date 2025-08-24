document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('configBtn').addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
        window.close();
    });
    
    document.getElementById('settingsLink').addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
        window.close();
    });
});