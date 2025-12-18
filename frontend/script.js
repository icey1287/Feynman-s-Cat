// 费曼的猫 - 前端脚本

const API_BASE = '';  // 相对路径
let currentSessionId = null;
let isLoading = false;
let loadingTipsInterval = null;
let catName = '小费曼';

// 本地存储key
const STORAGE_KEYS = {
    CAT_NAME: 'feynman_cat_name',
    SESSIONS: 'feynman_sessions',
    CURRENT_SESSION: 'feynman_current_session',
    FIRST_VISIT: 'feynman_first_visit'
};

// 加载提示语
const loadingTipsList = [
    '正在连接AI服务...',
    '猫咪正在准备问题...',
    '正在组织语言...',
    '思考中，请稍候...',
    '正在生成回复...',
    '快好了，再等一下...',
    '猫咪很努力在想...',
    '正在理解你的知识点...'
];

// ==================== 本地存储管理 ====================

function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error('Load from storage error:', e);
        return defaultValue;
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Save to storage error:', e);
    }
}

function getAllSessions() {
    return loadFromStorage(STORAGE_KEYS.SESSIONS, {});
}

function saveSession(sessionId, sessionData) {
    const sessions = getAllSessions();
    sessions[sessionId] = {
        ...sessionData,
        updatedAt: new Date().toISOString()
    };
    saveToStorage(STORAGE_KEYS.SESSIONS, sessions);
}

function deleteSession(sessionId) {
    const sessions = getAllSessions();
    delete sessions[sessionId];
    saveToStorage(STORAGE_KEYS.SESSIONS, sessions);
    
    if (currentSessionId === sessionId) {
        createNewSession();
    }
    renderSessionList();
}

function getCurrentSessionData() {
    if (!currentSessionId) return null;
    const sessions = getAllSessions();
    return sessions[currentSessionId] || null;
}

// ==================== 会话管理 ====================

function createNewSession() {
    currentSessionId = 'session_' + Date.now();
    saveToStorage(STORAGE_KEYS.CURRENT_SESSION, currentSessionId);
    
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
    document.getElementById('catCatchphrase').textContent = '';
    
    // 重置知识条
    updateKnowledgeBar(0, 0, '0/100 (让我们开始吧！)');
    
    renderSessionList();
}

// 恢复后端会话状态
async function restoreBackendSession(sessionId, session) {
    if (!session || !session.topic) return false;
    
    try {
        const response = await fetch(`${API_BASE}/api/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                topic: session.topic,
                knowledge_level: session.knowledgeLevel || 0,
                messages: session.messages || []
            })
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Restore session error:', error);
        return false;
    }
}

function switchSession(sessionId) {
    const sessions = getAllSessions();
    const session = sessions[sessionId];
    
    if (!session) {
        console.error('Session not found:', sessionId);
        return;
    }
    
    currentSessionId = sessionId;
    saveToStorage(STORAGE_KEYS.CURRENT_SESSION, currentSessionId);
    
    // 恢复会话状态
    if (session.topic) {
        // 先恢复后端会话
        restoreBackendSession(sessionId, session).then(success => {
            if (!success) {
                console.warn('Failed to restore backend session, but UI will still show history');
            }
        });
        
        document.getElementById('startForm').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'block';
        document.getElementById('currentTopic').style.display = 'flex';
        document.getElementById('topicName').textContent = session.topic;
        
        // 恢复知识条
        updateKnowledgeBar(session.knowledgeLevel || 0, 0, session.progressText || `${session.knowledgeLevel || 0}/100`);
        
        // 恢复猫咪状态
        if (session.catState) {
            updateCatState(session.catState);
        }
        
        // 恢复聊天记录
        document.getElementById('chatMessages').innerHTML = '';
        if (session.messages) {
            session.messages.forEach(msg => {
                addMessage(msg.type, msg.content, msg.knowledgeGain, false);
            });
        }
        
        // 检查是否已通关
        if (session.knowledgeLevel >= 100) {
            document.getElementById('celebration').style.display = 'flex';
            document.getElementById('completedTopic').textContent = session.topic;
            document.getElementById('catNameInCelebration').textContent = catName;
        }
    } else {
        // 新会话
        document.getElementById('startForm').style.display = 'block';
        document.getElementById('chatContainer').style.display = 'none';
        document.getElementById('currentTopic').style.display = 'none';
    }
    
    renderSessionList();
}

function renderSessionList() {
    const sessions = getAllSessions();
    const sessionList = document.getElementById('sessionList');
    
    // 按更新时间排序
    const sortedSessions = Object.entries(sessions)
        .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt));
    
    if (sortedSessions.length === 0) {
        sessionList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">暂无历史会话</p>';
        return;
    }
    
    sessionList.innerHTML = sortedSessions.map(([id, session]) => {
        const isActive = id === currentSessionId;
        const progress = session.knowledgeLevel || 0;
        const emoji = progress >= 100 ? '✅' : progress >= 50 ? '📖' : '📚';
        const date = new Date(session.updatedAt).toLocaleDateString('zh-CN');
        
        return `
            <div class="session-item ${isActive ? 'active' : ''}" onclick="switchSession('${id}')">
                <div class="session-topic">
                    <span>${emoji}</span>
                    <span>${session.topic || '新会话'}</span>
                    <button class="session-delete" onclick="event.stopPropagation(); deleteSession('${id}')">🗑️</button>
                </div>
                <div class="session-progress">进度: ${progress}%</div>
                <div class="session-date">${date}</div>
            </div>
        `;
    }).join('');
}

// ==================== 侧边栏 ====================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    sidebar.classList.toggle('hidden');
    mainContent.classList.toggle('expanded');
}

// ==================== 设置管理 ====================

function openSettings() {
    document.getElementById('catNameInput').value = catName;
    document.getElementById('settingsOverlay').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsOverlay').style.display = 'none';
}

function saveSettings() {
    const newName = document.getElementById('catNameInput').value.trim() || '小费曼';
    catName = newName;
    saveToStorage(STORAGE_KEYS.CAT_NAME, catName);
    updateCatNameDisplay();
    closeSettings();
}

function updateCatNameDisplay() {
    document.getElementById('catName').textContent = catName;
    document.getElementById('catNameInForm').textContent = catName;
    document.getElementById('catNameInCelebration').textContent = catName;
    
    // 更新加载提示
    loadingTipsList[1] = `${catName}正在准备问题...`;
    loadingTipsList[6] = `${catName}很努力在想...`;
}

// ==================== 首次访问 ====================

function checkFirstVisit() {
    const isFirstVisit = !loadFromStorage(STORAGE_KEYS.FIRST_VISIT);
    
    if (isFirstVisit) {
        document.getElementById('welcomeOverlay').style.display = 'flex';
    }
}

function completeWelcome() {
    const name = document.getElementById('welcomeCatName').value.trim() || '小费曼';
    catName = name;
    saveToStorage(STORAGE_KEYS.CAT_NAME, catName);
    saveToStorage(STORAGE_KEYS.FIRST_VISIT, true);
    updateCatNameDisplay();
    document.getElementById('welcomeOverlay').style.display = 'none';
}

// ==================== 加载弹窗 ====================

// 显示加载弹窗
function showLoading(text = '猫咪正在思考...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    loadingText.textContent = text.replace('小费曼', catName);
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

// ==================== 配置检查 ====================

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

// ==================== 学习流程 ====================

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
            body: JSON.stringify({ 
                topic, 
                session_id: currentSessionId,
                cat_name: catName
            })
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
            updateKnowledgeBar(data.knowledge_level, 0, data.progress_text);
            
            // 播放动画
            playCatAnimation(data.animation);
            
            // 添加AI消息
            addMessage('ai', data.ai_response.response);
            
            // 显示提示
            if (data.ai_response.hint) {
                showHint(data.ai_response.hint);
            }
            
            // 保存会话
            saveSession(currentSessionId, {
                topic: topic,
                knowledgeLevel: data.knowledge_level,
                progressText: data.progress_text,
                catState: data.cat_state,
                messages: [{ type: 'ai', content: data.ai_response.response }]
            });
            
            renderSessionList();
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
            body: JSON.stringify({ 
                message, 
                session_id: currentSessionId,
                cat_name: catName
            })
        });
        
        const data = await response.json();
        
        // 移除输入指示器
        removeTypingIndicator();
        
        if (data.success) {
            // 更新状态
            updateCatState(data.cat_state);
            updateKnowledgeBar(data.knowledge_level, data.knowledge_gain, data.progress_text);
            
            // 播放动画
            playCatAnimation(data.animation);
            
            // 显示增长反馈
            if (data.gain_text) {
                showGainFeedback(data.gain_text);
            }
            
            // 添加AI消息
            addMessage('ai', data.ai_response.response, data.knowledge_gain);
            
            // 显示提示
            if (data.ai_response.hint) {
                showHint(data.ai_response.hint);
            }
            
            // 更新本地存储
            const session = getCurrentSessionData() || {};
            session.knowledgeLevel = data.knowledge_level;
            session.progressText = data.progress_text;
            session.catState = data.cat_state;
            session.messages = session.messages || [];
            session.messages.push({ type: 'user', content: message });
            session.messages.push({ type: 'ai', content: data.ai_response.response, knowledgeGain: data.knowledge_gain });
            saveSession(currentSessionId, session);
            
            // 更新历史会话列表
            renderSessionList();
            
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
function addMessage(type, content, knowledgeGain = null, saveToSession = true) {
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
    
    // 显示口头禅
    if (catState.catchphrase) {
        document.getElementById('catCatchphrase').textContent = catState.catchphrase;
    }
}

// 播放猫咪动画
function playCatAnimation(animationType) {
    const avatar = document.getElementById('catAvatar');
    
    // 移除所有动画类
    avatar.classList.remove('tail-wag', 'ear-twitch', 'paw-tap', 'thinking', 'confused', 'celebrate');
    
    // 添加新动画
    if (animationType) {
        const animationClass = animationType.replace('_', '-');
        avatar.classList.add(animationClass);
        
        // 动画结束后恢复默认
        setTimeout(() => {
            avatar.classList.remove(animationClass);
        }, 2000);
    }
}

// 更新知识条
function updateKnowledgeBar(level, gain = 0, progressText = null) {
    const fill = document.getElementById('knowledgeFill');
    const progressTextEl = document.getElementById('progressText');
    
    fill.style.width = `${level}%`;
    
    if (progressText) {
        progressTextEl.textContent = progressText;
    } else {
        progressTextEl.textContent = `${level}%`;
    }
    
    // 如果有增长，添加闪烁效果
    if (gain > 0) {
        fill.classList.add('growing');
        setTimeout(() => {
            fill.classList.remove('growing');
        }, 1500);
    }
}

// 显示增长反馈
function showGainFeedback(text) {
    const feedback = document.getElementById('gainFeedback');
    feedback.textContent = text;
    feedback.style.display = 'block';
}

// 显示提示
function showHint(hint) {
    const hintBox = document.getElementById('hintBox');
    const hintText = document.getElementById('hintText');
    hintText.textContent = hint;
    hintBox.style.display = 'flex';
}

// 显示通关庆祝
function showCelebration() {
    const celebration = document.getElementById('celebration');
    const topicName = document.getElementById('topicName').textContent;
    document.getElementById('completedTopic').textContent = topicName;
    document.getElementById('catNameInCelebration').textContent = catName;
    celebration.style.display = 'flex';
}

// 重置会话
async function resetSession() {
    try {
        await fetch(`${API_BASE}/api/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });
    } catch (error) {
        console.error('Reset error:', error);
    }
    
    // 创建新会话
    createNewSession();
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 加载猫咪昵称
    catName = loadFromStorage(STORAGE_KEYS.CAT_NAME, '小费曼');
    updateCatNameDisplay();
    
    // 检查首次访问
    checkFirstVisit();
    
    // 不在刷新时自动恢复上次会话 — 总是进入初始页面
    // 清除存储的当前会话，保证刷新后回到起始页（仍保留历史会话在侧边栏）
    try {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    } catch (e) {
        console.warn('无法移除当前会话存储:', e);
    }
    currentSessionId = null;
    createNewSession();
    
    // 渲染会话列表
    renderSessionList();
    
    // 检查配置
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
    
    // 移动端默认隐藏侧边栏
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('hidden');
        document.querySelector('.main-content').classList.add('expanded');
    }
});
