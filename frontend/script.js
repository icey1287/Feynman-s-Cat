// 费曼的猫 - 前端脚本

const API_BASE = '';  // 相对路径
let sessionId = 'session_' + Date.now();
let isLoading = false;
let loadingTipsInterval = null;

// 加载提示语
const loadingTipsList = [
    '正在连接AI服务...',
    '小费曼正在准备问题...',
    '正在组织语言...',
    '思考中，请稍候...',
    '正在生成回复...',
    '快好了，再等一下...',
    '小费曼很努力在想...',
    '正在理解你的知识点...'
];

// 显示加载弹窗
function showLoading(text = '小费曼正在思考...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    loadingText.textContent = text;
    overlay.style.display = 'flex';
    
    // 开始轮换提示语
    let tipIndex = 0;
    loadingTipsInterval = setInterval(() => {
        tipIndex = (tipIndex + 1) % loadingTipsList.length;
        document.getElementById('loadingTips').textContent = loadingTipsList[tipIndex];
    }, 2000);
}

// 隐藏加载弹窗
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
    
    if (loadingTipsInterval) {
        clearInterval(loadingTipsInterval);
        loadingTipsInterval = null;
    }
}

// 检查配置状态
async function checkConfig() {
    try {
        const response = await fetch(`${API_BASE}/api/config`);
        const data = await response.json();
        
        if (!data.configured) {
            showSystemMessage('⚠️ 请先配置API密钥。在 .env 文件中设置 API_KEY、BASE_URL 和 MODEL');
        } else {
            console.log(`✅ 配置已加载: ${data.model} @ ${data.base_url}`);
        }
    } catch (error) {
        showSystemMessage('⚠️ 无法连接到服务器，请确保后端已启动');
    }
}

// 显示系统消息
function showSystemMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const systemMsg = document.createElement('div');
    systemMsg.className = 'message ai';
    systemMsg.innerHTML = `
        <div class="message-avatar">⚠️</div>
        <div class="message-content">${message}</div>
    `;
    chatMessages.appendChild(systemMsg);
}

// 设置话题
function setTopic(topic) {
    document.getElementById('topicInput').value = topic;
}

// 处理话题输入框回车
function handleTopicKeyPress(event) {
    if (event.key === 'Enter') {
        startLearning();
    }
}

// 处理消息输入框回车
function handleMessageKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// 开始学习
async function startLearning() {
    const topicInput = document.getElementById('topicInput');
    const topic = topicInput.value.trim();
    
    if (!topic) {
        alert('请输入一个知识点！');
        return;
    }
    
    setLoadingState(true);
    showLoading(`正在学习「${topic}」...`);
    
    try {
        const response = await fetch(`${API_BASE}/api/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, session_id: sessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 隐藏开始表单，显示聊天区域
            document.getElementById('startForm').style.display = 'none';
            document.getElementById('chatContainer').style.display = 'block';
            document.getElementById('currentTopic').style.display = 'flex';
            document.getElementById('topicName').textContent = topic;
            
            // 更新猫咪状态
            updateCatState(data.cat_state);
            updateKnowledgeBar(data.knowledge_level);
            
            // 添加AI消息
            addMessage('ai', data.ai_response.response);
            
            // 显示提示
            if (data.ai_response.hint) {
                showHint(data.ai_response.hint);
            }
        } else {
            alert(data.error || '出错了，请重试');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('连接服务器失败，请检查后端是否启动');
    }
    
    hideLoading();
    setLoadingState(false);
}

// 发送消息
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || isLoading) return;
    
    setLoadingState(true);
    messageInput.value = '';
    
    // 添加用户消息
    addMessage('user', message);
    
    // 显示正在输入指示器
    showTypingIndicator();
    
    try {
        const response = await fetch(`${API_BASE}/api/teach`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, session_id: sessionId })
        });
        
        const data = await response.json();
        
        // 移除输入指示器
        removeTypingIndicator();
        
        if (data.success) {
            // 更新状态
            updateCatState(data.cat_state);
            updateKnowledgeBar(data.knowledge_level, data.knowledge_gain);
            
            // 添加AI消息
            addMessage('ai', data.ai_response.response, data.knowledge_gain);
            
            // 显示提示
            if (data.ai_response.hint) {
                showHint(data.ai_response.hint);
            }
            
            // 检查是否通关
            if (data.is_complete) {
                setTimeout(() => showCelebration(), 1000);
            }
        } else {
            addMessage('ai', data.error || '喵...出了点问题');
        }
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessage('ai', '喵...连接出错了，请重试');
    }
    
    setLoadingState(false);
}

// 添加消息到聊天区域
function addMessage(type, content, knowledgeGain = null) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = type === 'ai' ? '🐱' : '👤';
    let html = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${escapeHtml(content)}
    `;
    
    if (type === 'ai' && knowledgeGain !== null && knowledgeGain > 0) {
        html += `<div class="knowledge-gain">✨ 知识+${knowledgeGain}</div>`;
    }
    
    html += '</div>';
    messageDiv.innerHTML = html;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 转义HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示正在输入指示器
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const indicator = document.createElement('div');
    indicator.id = 'typingIndicator';
    indicator.className = 'message ai';
    indicator.innerHTML = `
        <div class="message-avatar">🐱</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 移除输入指示器
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// 更新猫咪状态
function updateCatState(catState) {
    document.getElementById('catEmoji').textContent = catState.emoji;
    document.getElementById('catStatus').textContent = catState.message;
    
    // 更新头像动画
    const avatar = document.getElementById('catAvatar');
    avatar.style.animation = 'none';
    avatar.offsetHeight; // 触发重绘
    avatar.style.animation = 'bounce 2s ease-in-out infinite';
}

// 更新知识条
function updateKnowledgeBar(level, gain = 0) {
    const fill = document.getElementById('knowledgeFill');
    const value = document.getElementById('knowledgeValue');
    
    fill.style.width = `${level}%`;
    value.textContent = `${level}%`;
    
    // 如果有增长，添加闪烁效果
    if (gain > 0) {
        fill.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
            fill.style.animation = '';
        }, 500);
    }
}

// 显示提示
function showHint(hint) {
    const hintBox = document.getElementById('hintBox');
    const hintText = document.getElementById('hintText');
    hintText.textContent = hint;
    hintBox.style.display = 'flex';
    
    // 5秒后隐藏
    setTimeout(() => {
        hintBox.style.display = 'none';
    }, 5000);
}

// 显示通关庆祝
function showCelebration() {
    const celebration = document.getElementById('celebration');
    const topicName = document.getElementById('topicName').textContent;
    document.getElementById('completedTopic').textContent = topicName;
    celebration.style.display = 'flex';
}

// 重置会话
async function resetSession() {
    try {
        await fetch(`${API_BASE}/api/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        });
    } catch (error) {
        console.error('Reset error:', error);
    }
    
    // 生成新的会话ID
    sessionId = 'session_' + Date.now();
    
    // 重置UI
    document.getElementById('startForm').style.display = 'block';
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('currentTopic').style.display = 'none';
    document.getElementById('celebration').style.display = 'none';
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('topicInput').value = '';
    document.getElementById('hintBox').style.display = 'none';
    
    // 重置猫咪状态
    document.getElementById('catEmoji').textContent = '😺';
    document.getElementById('catStatus').textContent = '等待学习新知识...';
    
    // 重置知识条
    updateKnowledgeBar(0);
}

// 设置加载状态
function setLoadingState(loading) {
    isLoading = loading;
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.disabled = loading;
        sendBtn.textContent = loading ? '发送中...' : '发送 📨';
    }
}

// 页面加载完成后检查配置
document.addEventListener('DOMContentLoaded', () => {
    checkConfig();
    
    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
    `;
    document.head.appendChild(style);
});
