// 费曼的猫 - 前端脚本

const API_BASE = '';  // 相对路径
let currentSessionId = null;
let isLoading = false;
let loadingTipsInterval = null;
let catName = '小费曼';
let isRecording = false;
let mediaStream = null;
let audioContext = null;
let audioProcessor = null;
let audioSource = null;
let audioChunks = [];
let recordingSampleRate = 0;
const ASR_SAMPLE_RATE = 8000;

// 本地存储key
const STORAGE_KEYS = {
    CAT_NAME: 'feynman_cat_name',
    SESSIONS: 'feynman_sessions',
    CURRENT_SESSION: 'feynman_current_session',
    FIRST_VISIT: 'feynman_first_visit',
    GRADE: 'feynman_grade',
    SUBJECT: 'feynman_subject',
    ACHIEVEMENTS: 'feynman_achievements',
    STATS: 'feynman_stats'
};

// 用户资料
let userGrade = 'default';
let userSubject = 'all';

// 热门话题配置（按年级和学科 - 使用具体小知识点）
const HOT_TOPICS = {
    // 按年级分类 - 使用与HTML相同的key
    'primary_1_3': {
        'all': ['10以内加减法', '三角形和圆形', '春夏秋冬', '小蝌蚪变青蛙'],
        'math': ['凑十法', '钟表读数', '比大小符号', '图形数数'],
        'chinese': ['声母b p m f', '田字格写字', '看图说话', '小猫钓鱼'],
        'english': ['字母A B C', '红黄蓝颜色', '数字one two', '小动物cat dog'],
        'science': ['蚂蚁搬家', '种子发芽', '影子变化', '冰变成水'],
        'default': ['凑十法', '声母b p m f', '春夏秋冬', '三角形']
    },
    'primary_4_6': {
        'all': ['分数加减', '叶绿体作用', '黄河流向', '静夜思'],
        'math': ['通分', '长方形面积', '小数除法', '鸡兔同笼'],
        'chinese': ['比喻修辞', '写景作文', '草船借箭', '学奕'],
        'english': ['现在进行时', '颜色词汇', 'What is this句型', '看图写话'],
        'physics': ['光沿直线传播', '杠杆原理', '水的浮力', '磁铁南北极'],
        'chemistry': ['固液气三态', '氧气含量', '蜡烛燃烧', '过滤方法'],
        'biology': ['叶绿体作用', '哺乳动物特征', '心脏跳动', '草原食物链'],
        'history': ['造纸术发明', '嫦娥奔月', '大禹治水', '岳飞抗金'],
        'geography': ['黄河流向', '家乡地形图', '东南西北', '山地平原'],
        'default': ['通分', '叶绿体作用', '静夜思', '现在进行时']
    },
    'middle_school': {
        'all': ['配方法解方程', '细胞膜结构', '出师表翻译', '力的平衡'],
        'math': ['配方法', '一次函数斜率', '三角形全等', '频率直方图'],
        'chinese': ['出师表翻译', '议论文三要素', '骆驼祥子', '望岳鉴赏'],
        'english': ['过去完成时', '阅读主旨题', '情态动词用法', '邀请信格式'],
        'physics': ['力的平衡', '串并联电路', '入射角反射角', '大气压强'],
        'chemistry': ['化学式书写', '中和反应', '金属活动顺序', '氧化与还原'],
        'biology': ['细胞膜结构', 'DNA双螺旋', '碳循环', '小肠绒毛'],
        'history': ['洋务运动', '卢沟桥事变', '武昌起义', '家庭联产承包'],
        'geography': ['温带季风气候', '人口金字塔', '煤炭分布', '京广铁路'],
        'politics': ['公民基本权利', '未成年人保护法', '人民代表大会', '初级阶段'],
        'default': ['配方法', '力的平衡', '细胞膜结构', '出师表翻译']
    },
    'high_school': {
        'all': ['导数求极值', '酯化反应', '矛盾特殊性', '法拉第电磁感应'],
        'math': ['导数求极值', '数列通项公式', '空间向量', '二项式展开'],
        'chinese': ['滕王阁序典故', '作文立意', '意识流小说', '雨巷意象'],
        'english': ['定语从句关系词', '长难句分析', '书信结尾', '听力数字题'],
        'physics': ['法拉第电磁感应', '动量定理', '第一宇宙速度', '简谐振动'],
        'chemistry': ['酯化反应', '勒夏特列原理', '原电池原理', '杂化轨道'],
        'biology': ['转录翻译', '突触传递', 'T细胞B细胞', '能量金字塔'],
        'history': ['一战导火索', '蒸汽机发明', '文艺复兴三杰', '铁幕演说'],
        'geography': ['三圈环流', '北大西洋暖流', '城市功能分区', '循环经济'],
        'politics': ['矛盾特殊性', '边际效用', '政体与国体', '文化自信'],
        'default': ['导数求极值', '法拉第电磁感应', '酯化反应', '矛盾特殊性']
    },
    'university': {
        'all': ['快速排序', '薛定谔方程', 'IS-LM模型', '反向传播算法'],
        'math': ['矩阵的秩', '贝叶斯公式', '柯西积分', 'Lp空间'],
        'physics': ['薛定谔方程', '卡诺循环', '麦克斯韦方程组', '洛伦兹变换'],
        'chemistry': ['亲核取代SN2', '晶体场理论', '阿伦尼乌斯公式', '分子轨道'],
        'biology': ['PCR扩增', '基因组注释', '长时程增强', '自然选择压力'],
        'cs': ['快速排序', '进程调度', 'TCP三次握手', 'LL语法分析'],
        'programming': ['快速排序', '进程调度', 'TCP三次握手', 'LL语法分析'],
        'economics': ['IS-LM模型', '弹性系数', '纳什均衡', '回归分析'],
        'ai': ['反向传播算法', '梯度下降', 'CNN卷积层', 'Transformer注意力'],
        'psychology': ['工作记忆', '皮亚杰阶段', '从众实验', 't检验'],
        'philosophy': ['三段论', '功利主义', '本体论证明', '知识三元定义'],
        'default': ['快速排序', '薛定谔方程', 'IS-LM模型', '反向传播算法']
    },
    'default': {
        'all': ['二分查找', '叶绿体光反应', '需求弹性', '牛顿第三定律'],
        'math': ['洛必达法则', '矩阵乘法', '条件概率', '素数判定'],
        'physics': ['牛顿第三定律', '欧姆定律', '热传导', '时间膨胀'],
        'chemistry': ['共价键', '酸碱滴定', '烷烃命名', '电极电势'],
        'biology': ['有丝分裂', '孟德尔定律', '物种形成', '碳循环'],
        'cs': ['二分查找', '栈和队列', '时间复杂度', '单例模式'],
        'programming': ['二分查找', '栈和队列', '时间复杂度', '单例模式'],
        'default': ['二分查找', '叶绿体光反应', '需求弹性', '牛顿第三定律']
    }
};

// 年级对应的学科列表
const GRADE_SUBJECTS = {
    'primary_1_3': ['all', 'math', 'chinese'],
    'primary_4_6': ['all', 'math', 'chinese', 'english', 'science'],
    'middle_school': ['all', 'math', 'chinese', 'english', 'physics', 'chemistry', 'biology', 'history', 'geography', 'politics'],
    'high_school': ['all', 'math', 'chinese', 'english', 'physics', 'chemistry', 'biology', 'history', 'geography', 'politics'],
    'university': ['all', 'math', 'physics', 'chemistry', 'biology', 'cs', 'programming', 'economics', 'ai', 'psychology', 'philosophy'],
    'default': ['all', 'math', 'physics', 'chemistry', 'biology', 'cs', 'programming', 'economics']
};

// 学科名称映射
const SUBJECT_LABELS = {
    'all': '百科全书（所有学科）',
    'math': '数学',
    'chinese': '语文',
    'english': '英语',
    'science': '科学',
    'physics': '物理',
    'chemistry': '化学',
    'biology': '生物',
    'history': '历史',
    'geography': '地理',
    'politics': '政治',
    'cs': '计算机科学',
    'programming': '编程/计算机',
    'economics': '经济学',
    'ai': '人工智能',
    'psychology': '心理学',
    'philosophy': '哲学',
    'art': '艺术',
    'music': '音乐'
};

// 成就定义
const ACHIEVEMENTS = {
    first_topic: {
        id: 'first_topic',
        name: '初露锋芒',
        description: '开始第一个知识点的学习',
        icon: '🌟'
    },
    first_complete: {
        id: 'first_complete',
        name: '循循善诱',
        description: '完成第一个知识点（知识条达到100%）',
        icon: '🏆'
    },
    reach_50: {
        id: 'reach_50',
        name: '渐入佳境',
        description: '将知识条提升到50%',
        icon: '📈'
    },
    five_topics: {
        id: 'five_topics',
        name: '博学多才',
        description: '学习5个不同的知识点',
        icon: '📚'
    },
    ten_topics: {
        id: 'ten_topics',
        name: '知识达人',
        description: '学习10个不同的知识点',
        icon: '🎓'
    },
    three_complete: {
        id: 'three_complete',
        name: '教学能手',
        description: '完成3个知识点',
        icon: '⭐'
    },
    five_complete: {
        id: 'five_complete',
        name: '费曼大师',
        description: '完成5个知识点',
        icon: '👑'
    },
    high_score: {
        id: 'high_score',
        name: '一语中的',
        description: '单次获得20分以上的知识增长',
        icon: '💡'
    },
    streak_3: {
        id: 'streak_3',
        name: '持之以恒',
        description: '连续3天学习',
        icon: '🔥'
    },
    streak_7: {
        id: 'streak_7',
        name: '学习达人',
        description: '连续7天学习',
        icon: '🌈'
    },
    total_knowledge_500: {
        id: 'total_knowledge_500',
        name: '知识积累',
        description: '累计获得500分知识点',
        icon: '💎'
    },
    messages_50: {
        id: 'messages_50',
        name: '侃侃而谈',
        description: '发送50条教学消息',
        icon: '💬'
    }
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
    
    // 清除之前的hint和得分提示
    document.getElementById('hintBox').style.display = 'none';
    document.getElementById('gainFeedback').style.display = 'none';

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
    document.getElementById('gradeSelect').value = userGrade;
    // 先更新学科选项，再设置当前值
    updateSubjectOptions('gradeSelect', 'subjectSelect');
    document.getElementById('subjectSelect').value = userSubject;
    document.getElementById('settingsOverlay').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsOverlay').style.display = 'none';
}

function saveSettings() {
    const newName = document.getElementById('catNameInput').value.trim() || '小费曼';
    const newGrade = document.getElementById('gradeSelect').value;
    const newSubject = document.getElementById('subjectSelect').value;
    
    catName = newName;
    userGrade = newGrade;
    userSubject = newSubject;
    
    saveToStorage(STORAGE_KEYS.CAT_NAME, catName);
    saveToStorage(STORAGE_KEYS.GRADE, userGrade);
    saveToStorage(STORAGE_KEYS.SUBJECT, userSubject);
    
    updateCatNameDisplay();
    updateHotTopics();
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
    const grade = document.getElementById('welcomeGrade').value || 'default';
    const subject = document.getElementById('welcomeSubject').value || 'all';
    
    catName = name;
    userGrade = grade;
    userSubject = subject;
    
    saveToStorage(STORAGE_KEYS.CAT_NAME, catName);
    saveToStorage(STORAGE_KEYS.GRADE, userGrade);
    saveToStorage(STORAGE_KEYS.SUBJECT, userSubject);
    saveToStorage(STORAGE_KEYS.FIRST_VISIT, true);
    
    updateCatNameDisplay();
    updateHotTopics();
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

// 更新学科选项（根据年级）
function updateSubjectOptions(gradeSelectId, subjectSelectId) {
    const gradeSelect = document.getElementById(gradeSelectId);
    const subjectSelect = document.getElementById(subjectSelectId);
    if (!gradeSelect || !subjectSelect) return;
    
    const grade = gradeSelect.value;
    const subjects = GRADE_SUBJECTS[grade] || GRADE_SUBJECTS['default'];
    
    // 保存当前选择
    const currentSubject = subjectSelect.value;
    
    // 清空并重新生成选项
    subjectSelect.innerHTML = '';
    subjects.forEach(subjectId => {
        const option = document.createElement('option');
        option.value = subjectId;
        option.textContent = SUBJECT_LABELS[subjectId] || subjectId;
        subjectSelect.appendChild(option);
    });
    
    // 如果当前学科在新列表中，保持选择；否则重置为all
    if (subjects.includes(currentSubject)) {
        subjectSelect.value = currentSubject;
    } else {
        subjectSelect.value = 'all';
    }
}

// 更新热门话题显示
function updateHotTopics() {
    const container = document.getElementById('topicExamples');
    if (!container) return;
    
    // 根据年级和学科获取话题
    const gradeTopics = HOT_TOPICS[userGrade] || HOT_TOPICS['default'];
    const topics = gradeTopics[userSubject] || gradeTopics['default'] || gradeTopics['all'];
    
    // 生成按钮HTML
    let html = '<span>热门话题：</span>';
    topics.forEach(topic => {
        html += `<button onclick="setTopic('${topic}')">${topic}</button>`;
    });
    
    container.innerHTML = html;
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
                cat_name: catName,
                grade: userGrade,
                subject: userSubject
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
            
            // 处理AI响应（防止嵌套格式问题）
            let aiResponse = data.ai_response;
            let responseText = '';
            let hint = '';
            
            if (typeof aiResponse === 'string') {
                responseText = aiResponse;
            } else if (aiResponse && typeof aiResponse === 'object') {
                if (aiResponse.response && typeof aiResponse.response === 'object') {
                    responseText = aiResponse.response.response || JSON.stringify(aiResponse.response);
                } else {
                    responseText = aiResponse.response || JSON.stringify(aiResponse);
                }
                hint = aiResponse.hint || '';
            }
            
            // 添加AI消息
            addMessage('ai', responseText);
            
            // 第一次回复不显示hint（隐藏之前的hint）
            document.getElementById('hintBox').style.display = 'none';
            
            // 保存会话
            saveSession(currentSessionId, {
                topic: topic,
                knowledgeLevel: data.knowledge_level,
                progressText: data.progress_text,
                catState: data.cat_state,
                messages: [{ type: 'ai', content: responseText }]
            });
            
            renderSessionList();
            
            // 检查成就：开始第一个知识点
            checkAchievement('first_topic');
            
            // 更新统计
            updateStats('topicStarted');
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

// ==================== 语音输入 ====================

async function toggleRecording() {
    if (isRecording) {
        await stopRecordingAndSend();
        return;
    }
    if (isLoading) return;
    
    try {
        await startRecording();
    } catch (error) {
        console.error('Record start error:', error);
        isRecording = false;
        addMessage('ai', '麦克风不可用，请检查权限后再试');
        updateMicButton();
    }
}

async function startRecording() {
    // 检查环境：file:// 协议不支持
    if (window.location.protocol === 'file:') {
        addMessage('ai', '本地文件模式(file://)无法使用麦克风，请通过服务器访问(如 http://localhost:5000)');
        return;
    }

    // 检查 API 支持情况
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // 检查是否因为非安全上下文导致 API 被禁用
        if (window.location.protocol === 'http:' && 
            !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            addMessage('ai', '浏览器安全限制：语音功能仅支持 HTTPS 或 localhost 访问');
        } else {
            addMessage('ai', '当前浏览器不支持标准麦克风 API，请尝试升级浏览器');
        }
        return;
    }
    
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error('麦克风权限获取失败:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            addMessage('ai', '麦克风权限被拒绝，请点击地址栏左侧图标允许权限');
        } else if (err.name === 'NotFoundError') {
            addMessage('ai', '未找到麦克风设备');
        } else {
            addMessage('ai', `无法访问麦克风: ${err.message}`);
        }
        return;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    recordingSampleRate = audioContext.sampleRate;
    audioSource = audioContext.createMediaStreamSource(mediaStream);
    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    audioChunks = [];
    
    audioProcessor.onaudioprocess = (event) => {
        const channelData = event.inputBuffer.getChannelData(0);
        audioChunks.push(new Float32Array(channelData));
    };
    
    audioSource.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);
    isRecording = true;
    updateMicButton();
}

async function stopRecordingAndSend() {
    isRecording = false;
    updateMicButton();
    
    try {
        if (audioProcessor) audioProcessor.disconnect();
        if (audioSource) audioSource.disconnect();
        if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
        if (audioContext) await audioContext.close();
    } catch (error) {
        console.warn('Record stop error:', error);
    }
    mediaStream = null;
    audioContext = null;
    audioProcessor = null;
    audioSource = null;
    
    const merged = mergeFloat32Arrays(audioChunks);
    if (!merged || merged.length === 0) {
        addMessage('ai', '没有采集到有效音频，请再试一次');
        return;
    }
    
    try {
        const downsampled = downsampleBuffer(merged, recordingSampleRate || 48000, ASR_SAMPLE_RATE);
        const pcm16 = floatTo16BitPCM(downsampled);
        const base64audio = arrayBufferToBase64(pcm16.buffer);
        await sendAudioToAsr(base64audio);
    } catch (error) {
        console.error('ASR prep error:', error);
        addMessage('ai', '处理录音时出错，请再试一次');
    }
}

function mergeFloat32Arrays(chunks) {
    if (!chunks || chunks.length === 0) return null;
    const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    chunks.forEach(arr => {
        result.set(arr, offset);
        offset += arr.length;
    });
    return result;
}

function downsampleBuffer(buffer, sampleRate, outSampleRate) {
    if (!buffer || buffer.length === 0) return new Float32Array(0);
    if (outSampleRate === sampleRate) return buffer;
    const ratio = sampleRate / outSampleRate;
    if (ratio < 1) {
        throw new Error('输出采样率必须低于输入采样率');
    }
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        result[i] = buffer[Math.floor(i * ratio)];
    }
    return result;
}

function floatTo16BitPCM(floatBuffer) {
    const output = new Int16Array(floatBuffer.length);
    for (let i = 0; i < floatBuffer.length; i++) {
        let s = Math.max(-1, Math.min(1, floatBuffer[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

async function sendAudioToAsr(base64Audio) {
    setLoadingState(true);
    updateMicButton();
    try {
        const response = await fetch(`${API_BASE}/api/asr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audio_data: base64Audio,
                format: 'pcm',
                sample_rate: ASR_SAMPLE_RATE
            })
        });
        const data = await response.json();
        if (data.success) {
            const text = data.text || (data.raw && (data.raw.text || data.raw.result || (data.raw.data && data.raw.data.text))) || '';
            if (text) {
                const messageInput = document.getElementById('messageInput');
                messageInput.value = text;
                setLoadingState(false);
                await sendMessage();
                return;
            } else {
                addMessage('ai', '没有识别到语音，请再试一次');
            }
        } else {
            addMessage('ai', data.error || '语音识别失败');
        }
    } catch (error) {
        console.error('ASR error:', error);
        addMessage('ai', '语音识别出错，请稍后再试');
    }
    setLoadingState(false);
    updateMicButton();
}

function updateMicButton() {
    const micBtn = document.getElementById('micBtn');
    if (!micBtn) return;
    if (isRecording) {
        micBtn.textContent = '⏹️ 停止';
        micBtn.classList.add('recording');
        micBtn.disabled = false;
    } else {
        micBtn.textContent = '🎙️ 语音';
        micBtn.classList.remove('recording');
        micBtn.disabled = isLoading;
    }
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
            
            // 处理AI响应（防止嵌套格式问题）
            let aiResponse = data.ai_response;
            let responseText = '';
            let hint = '';
            
            if (typeof aiResponse === 'string') {
                responseText = aiResponse;
            } else if (aiResponse && typeof aiResponse === 'object') {
                // 如果response本身又是一个对象，取其中的response
                if (aiResponse.response && typeof aiResponse.response === 'object') {
                    responseText = aiResponse.response.response || JSON.stringify(aiResponse.response);
                } else {
                    responseText = aiResponse.response || JSON.stringify(aiResponse);
                }
                hint = aiResponse.hint || '';
            }
            
            // 添加AI消息
            addMessage('ai', responseText, data.knowledge_gain);
            
            // 处理提示：当得分>5或无hint时隐藏；得分<=5且有hint才显示
            try {
                const hintBoxEl = document.getElementById('hintBox');
                if (hintBoxEl) hintBoxEl.style.display = 'none';
            } catch (e) {}
            if (hint &&  data.knowledge_gain <= 5) {
                showHint(hint);
            }
            
            // 更新本地存储
            const session = getCurrentSessionData() || {};
            session.knowledgeLevel = data.knowledge_level;
            session.progressText = data.progress_text;
            session.catState = data.cat_state;
            session.messages = session.messages || [];
            session.messages.push({ type: 'user', content: message });
            session.messages.push({ type: 'ai', content: responseText, knowledgeGain: data.knowledge_gain });
            saveSession(currentSessionId, session);
            
            // 更新历史会话列表
            renderSessionList();
            
            // 更新统计
            updateStats('messageSent', { knowledgeGain: data.knowledge_gain });
            
            // 检查成就
            if (data.knowledge_gain >= 20) {
                checkAchievement('high_score');
            }
            if (data.knowledge_level >= 50) {
                checkAchievement('reach_50');
            }
            
            // 检查是否通关
            if (data.is_complete) {
                checkAchievement('first_complete');
                updateStats('topicCompleted');
                checkCompletionAchievements();
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
    updateMicButton();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 加载猫咪昵称
    catName = loadFromStorage(STORAGE_KEYS.CAT_NAME, '小费曼');
    userGrade = loadFromStorage(STORAGE_KEYS.GRADE, 'default');
    userSubject = loadFromStorage(STORAGE_KEYS.SUBJECT, 'all');
    updateCatNameDisplay();
    
    // 更新热门话题
    updateHotTopics();
    
    // 绑定年级选择变化事件（设置页面）
    const gradeSelect = document.getElementById('gradeSelect');
    if (gradeSelect) {
        gradeSelect.addEventListener('change', () => {
            updateSubjectOptions('gradeSelect', 'subjectSelect');
        });
    }
    
    // 绑定年级选择变化事件（欢迎页面）
    const welcomeGrade = document.getElementById('welcomeGrade');
    if (welcomeGrade) {
        welcomeGrade.addEventListener('change', () => {
            updateSubjectOptions('welcomeGrade', 'welcomeSubject');
        });
    }
    
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
    
    // 更新连续天数
    updateStreak();
    
    // 初始化麦克风按钮状态
    updateMicButton();
    
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

// ==================== 成就系统 ====================

function getUnlockedAchievements() {
    return loadFromStorage(STORAGE_KEYS.ACHIEVEMENTS, {});
}

function unlockAchievement(achievementId) {
    const unlocked = getUnlockedAchievements();
    if (unlocked[achievementId]) return false; // 已解锁
    
    unlocked[achievementId] = {
        unlockedAt: new Date().toISOString()
    };
    saveToStorage(STORAGE_KEYS.ACHIEVEMENTS, unlocked);
    return true;
}

function checkAchievement(achievementId) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return;
    
    if (unlockAchievement(achievementId)) {
        showAchievementNotification(achievement);
    }
}

function checkCompletionAchievements() {
    const sessions = getAllSessions();
    const completedCount = Object.values(sessions).filter(s => s.knowledgeLevel >= 100).length;
    const totalCount = Object.keys(sessions).length;
    
    if (totalCount >= 5) checkAchievement('five_topics');
    if (totalCount >= 10) checkAchievement('ten_topics');
    if (completedCount >= 3) checkAchievement('three_complete');
    if (completedCount >= 5) checkAchievement('five_complete');
}

function showAchievementNotification(achievement) {
    const notification = document.getElementById('achievementNotification');
    document.getElementById('achievementNotificationIcon').textContent = achievement.icon;
    document.getElementById('achievementNotificationName').textContent = achievement.name;
    
    notification.style.display = 'block';
    notification.style.animation = 'none';
    notification.offsetHeight; // 触发重绘
    notification.style.animation = 'slideInRight 0.5s ease, fadeOut 0.5s ease 3s forwards';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3500);
}

function openAchievements() {
    const unlocked = getUnlockedAchievements();
    const list = document.getElementById('achievementsList');
    const unlockedCount = Object.keys(unlocked).length;
    const totalCount = Object.keys(ACHIEVEMENTS).length;
    
    document.getElementById('unlockedCount').textContent = unlockedCount;
    document.getElementById('totalCount').textContent = totalCount;
    
    list.innerHTML = Object.values(ACHIEVEMENTS).map(achievement => {
        const isUnlocked = unlocked[achievement.id];
        const unlockedDate = isUnlocked ? new Date(isUnlocked.unlockedAt).toLocaleDateString('zh-CN') : '';
        
        return `
            <div class="achievement-item ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="icon">${achievement.icon}</div>
                <div class="info">
                    <div class="name">${achievement.name}</div>
                    <div class="description">${achievement.description}</div>
                    ${isUnlocked ? `<div class="unlocked-date">🎉 ${unlockedDate} 解锁</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('achievementsOverlay').style.display = 'flex';
}

function closeAchievements() {
    document.getElementById('achievementsOverlay').style.display = 'none';
}

// ==================== 统计系统 ====================

let currentStatsDate = new Date(); // 当前查看的日期
let cachedSubjectClassifications = null;

// 学科名称映射
const SUBJECT_NAMES = {
    'math': '数学',
    'physics': '物理',
    'chemistry': '化学',
    'biology': '生物',
    'history': '历史',
    'geography': '地理',
    'chinese': '语文',
    'english': '英语',
    'programming': '编程/计算机',
    'art': '艺术',
    'music': '音乐',
    'philosophy': '哲学',
    'economics': '经济学',
    'psychology': '心理学',
    'other': '其他',
    'all': '百科全书'
};

function getStats() {
    return loadFromStorage(STORAGE_KEYS.STATS, {
        topicsStarted: 0,
        topicsCompleted: 0,
        totalKnowledge: 0,
        totalMessages: 0,
        currentStreak: 0,
        lastActiveDate: null,
        dailyKnowledge: {},
        dailyMessages: {},
        dailyTopics: {},
        subjectClassifications: {}
    });
}

function saveStats(stats) {
    saveToStorage(STORAGE_KEYS.STATS, stats);
}

function updateStats(action, data = {}) {
    const stats = getStats();
    const today = new Date().toISOString().split('T')[0];
    
    // 初始化每日统计
    stats.dailyKnowledge = stats.dailyKnowledge || {};
    stats.dailyMessages = stats.dailyMessages || {};
    stats.dailyTopics = stats.dailyTopics || {};
    
    switch (action) {
        case 'topicStarted':
            stats.topicsStarted = (stats.topicsStarted || 0) + 1;
            stats.dailyTopics[today] = (stats.dailyTopics[today] || 0) + 1;
            break;
        case 'topicCompleted':
            stats.topicsCompleted = (stats.topicsCompleted || 0) + 1;
            break;
        case 'messageSent':
            stats.totalMessages = (stats.totalMessages || 0) + 1;
            stats.dailyMessages[today] = (stats.dailyMessages[today] || 0) + 1;
            if (data.knowledgeGain) {
                stats.totalKnowledge = (stats.totalKnowledge || 0) + data.knowledgeGain;
                stats.dailyKnowledge[today] = (stats.dailyKnowledge[today] || 0) + data.knowledgeGain;
            }
            break;
    }
    
    stats.lastActiveDate = today;
    saveStats(stats);
    
    // 检查统计相关成就
    if (stats.totalKnowledge >= 500) checkAchievement('total_knowledge_500');
    if (stats.totalMessages >= 50) checkAchievement('messages_50');
}

function updateStreak() {
    const stats = getStats();
    const today = new Date().toISOString().split('T')[0];
    const lastActive = stats.lastActiveDate;
    
    if (!lastActive) {
        stats.currentStreak = 1;
    } else {
        const lastDate = new Date(lastActive);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            // 同一天，保持不变
        } else if (diffDays === 1) {
            // 连续天
            stats.currentStreak = (stats.currentStreak || 0) + 1;
        } else {
            // 中断
            stats.currentStreak = 1;
        }
    }
    
    stats.lastActiveDate = today;
    saveStats(stats);
    
    // 检查连续天数成就
    if (stats.currentStreak >= 3) checkAchievement('streak_3');
    if (stats.currentStreak >= 7) checkAchievement('streak_7');
}

// 格式化日期显示
function formatDateLabel(date) {
    const today = new Date();
    const targetDate = new Date(date);
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays === 2) return '前天';
    if (diffDays < 7) return `${diffDays}天前`;
    
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekDays[targetDate.getDay()];
}

function formatFullDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// 导航日期
function navigateStatsDate(direction) {
    // 先将当前日期归一化到午夜
    const current = new Date(currentStatsDate);
    current.setHours(12, 0, 0, 0); // 使用中午避免时区问题
    
    // 计算新日期
    const newDate = new Date(current);
    newDate.setDate(newDate.getDate() + direction);
    newDate.setHours(12, 0, 0, 0);
    
    // 获取今天（也归一化到中午）
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    // 不能超过今天
    if (newDate > today) return;
    
    currentStatsDate = newDate;
    updateStatsDisplay();
}

// 计算指定日期的统计数据
function calculateStatsForDate(date) {
    const stats = getStats();
    const sessions = getAllSessions();
    const dateStr = date.toISOString().split('T')[0];
    
    const knowledge = (stats.dailyKnowledge || {})[dateStr] || 0;
    const messages = (stats.dailyMessages || {})[dateStr] || 0;
    const topicsStarted = (stats.dailyTopics || {})[dateStr] || 0;
    
    let topicsCompleted = 0;
    Object.values(sessions).forEach(session => {
        if (session.knowledgeLevel >= 100 && session.updatedAt) {
            const sessionDate = session.updatedAt.split('T')[0];
            if (sessionDate === dateStr) {
                topicsCompleted++;
            }
        }
    });
    
    return {
        knowledge,
        messages,
        topicsCompleted,
        topicsStarted,
        streak: stats.currentStreak || 0
    };
}

// 更新统计显示
function updateStatsDisplay() {
    const dateStr = currentStatsDate.toISOString().split('T')[0];
    
    // 更新日期导航显示
    document.getElementById('statsDateLabel').textContent = formatDateLabel(currentStatsDate);
    document.getElementById('statsDateValue').textContent = formatFullDate(currentStatsDate);
    
    // 检查是否可以前进（不能超过今天）
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    document.getElementById('statsNextBtn').disabled = (dateStr >= todayStr);
    
    // 计算并显示统计
    const calculated = calculateStatsForDate(currentStatsDate);
    
    document.getElementById('statTopicsCompleted').textContent = calculated.topicsCompleted;
    document.getElementById('statTotalKnowledge').textContent = calculated.knowledge;
    document.getElementById('statTotalMessages').textContent = calculated.messages;
    document.getElementById('statCurrentStreak').textContent = calculated.streak;
    
    // 更新折线图
    renderLineChart();
}

async function openStats() {
    // 重置为今天（使用中午时间避免时区问题）
    currentStatsDate = new Date();
    currentStatsDate.setHours(12, 0, 0, 0);
    
    const stats = getStats();
    const sessions = getAllSessions();
    
    // 更新日期导航
    document.getElementById('statsDateLabel').textContent = '今天';
    document.getElementById('statsDateValue').textContent = formatFullDate(currentStatsDate);
    document.getElementById('statsNextBtn').disabled = true;
    
    // 计算今天的统计
    const calculated = calculateStatsForDate(currentStatsDate);
    
    document.getElementById('statTopicsCompleted').textContent = calculated.topicsCompleted;
    document.getElementById('statTotalKnowledge').textContent = calculated.knowledge;
    document.getElementById('statTotalMessages').textContent = calculated.messages;
    document.getElementById('statCurrentStreak').textContent = calculated.streak;
    
    // 生成折线图
    renderLineChart();
    
    // 生成学科分布（使用AI分类）
    await renderSubjectsChartWithAI(sessions);
    
    document.getElementById('statsOverlay').style.display = 'flex';
}

function closeStats() {
    document.getElementById('statsOverlay').style.display = 'none';
}

// 渲染折线图
function renderLineChart() {
    const stats = getStats();
    const svg = document.getElementById('lineChart');
    const labelsContainer = document.getElementById('chartXLabels');
    
    // 获取最近7天的数据
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(currentStatsDate);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    
    const knowledgeData = days.map(d => (stats.dailyKnowledge || {})[d] || 0);
    const messagesData = days.map(d => (stats.dailyMessages || {})[d] || 0);
    
    const maxKnowledge = Math.max(...knowledgeData, 10);
    const maxMessages = Math.max(...messagesData, 5);
    const maxValue = Math.max(maxKnowledge, maxMessages, 1);
    
    const width = 500;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 10, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // 计算点的位置
    const getX = (i) => padding.left + (i / (days.length - 1)) * chartWidth;
    const getY = (value) => padding.top + chartHeight - (value / maxValue) * chartHeight;
    
    // 生成路径
    const createPath = (data) => {
        if (data.every(v => v === 0)) return '';
        return data.map((v, i) => {
            const x = getX(i);
            const y = getY(v);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    };
    
    // 生成填充区域路径
    const createAreaPath = (data) => {
        if (data.every(v => v === 0)) return '';
        const linePath = createPath(data);
        const lastX = getX(data.length - 1);
        const firstX = getX(0);
        const bottomY = padding.top + chartHeight;
        return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    };
    
    // 生成网格线
    const gridLines = [];
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (i / 4) * chartHeight;
        const value = Math.round(maxValue * (1 - i / 4));
        gridLines.push(`<line class="grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"/>`);
        if (i < 4) {
            gridLines.push(`<text class="y-label" x="${padding.left - 5}" y="${y + 4}" text-anchor="end">${value}</text>`);
        }
    }
    
    // 高亮当前选中的日期（最后一天）
    const highlightIndex = days.length - 1;
    const highlightX = getX(highlightIndex);
    
    svg.innerHTML = `
        <defs>
            <linearGradient id="knowledgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#667eea"/>
                <stop offset="100%" style="stop-color:#764ba2"/>
            </linearGradient>
            <linearGradient id="messagesGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#00b894"/>
                <stop offset="100%" style="stop-color:#00cec9"/>
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
            </filter>
        </defs>
        
        <!-- 网格线 -->
        ${gridLines.join('')}
        
        <!-- 高亮当前日期 -->
        <rect x="${highlightX - 20}" y="${padding.top}" width="40" height="${chartHeight}" 
              fill="rgba(102, 126, 234, 0.1)" rx="5"/>
        
        <!-- 知识点填充区域 -->
        <path class="data-area knowledge" d="${createAreaPath(knowledgeData)}"/>
        
        <!-- 消息数填充区域 -->
        <path class="data-area messages" d="${createAreaPath(messagesData)}"/>
        
        <!-- 知识点折线 -->
        <path class="data-line knowledge" d="${createPath(knowledgeData)}" filter="url(#shadow)"/>
        
        <!-- 消息数折线 -->
        <path class="data-line messages" d="${createPath(messagesData)}" filter="url(#shadow)"/>
        
        <!-- 知识点数据点 -->
        ${knowledgeData.map((v, i) => `
            <circle class="data-point knowledge" cx="${getX(i)}" cy="${getY(v)}" r="${i === highlightIndex ? 6 : 4}">
                <title>${days[i]}: 知识+${v}</title>
            </circle>
        `).join('')}
        
        <!-- 消息数数据点 -->
        ${messagesData.map((v, i) => `
            <circle class="data-point messages" cx="${getX(i)}" cy="${getY(v)}" r="${i === highlightIndex ? 6 : 4}">
                <title>${days[i]}: ${v}条消息</title>
            </circle>
        `).join('')}
    `;
    
    // 更新X轴标签
    labelsContainer.innerHTML = days.map((d, i) => {
        const date = new Date(d);
        const label = i === highlightIndex ? formatDateLabel(date) : `${date.getMonth() + 1}/${date.getDate()}`;
        const isHighlight = i === highlightIndex;
        return `<span style="${isHighlight ? 'color: var(--primary-color); font-weight: 600;' : ''}">${label}</span>`;
    }).join('');
}

// 使用AI分类知识点学科
async function classifyTopicsWithAI(topics) {
    const stats = getStats();
    const cached = stats.subjectClassifications || {};
    
    // 找出需要分类的新话题
    const newTopics = topics.filter(t => !cached[t]);
    
    if (newTopics.length === 0) {
        return cached;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/classify-topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topics: newTopics })
        });
        
        const data = await response.json();
        
        if (data.success && data.results) {
            data.results.forEach(result => {
                cached[result.topic] = result.subject_id;
            });
            
            // 保存分类结果
            stats.subjectClassifications = cached;
            saveStats(stats);
        }
    } catch (error) {
        console.error('Topic classification error:', error);
    }
    
    return cached;
}

async function renderSubjectsChartWithAI(sessions) {
    const container = document.getElementById('subjectsChart');
    const loading = document.getElementById('subjectsLoading');
    
    const topics = Object.values(sessions)
        .filter(s => s.topic)
        .map(s => s.topic);
    
    if (topics.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无数据</p>';
        return;
    }
    
    // 显示加载
    loading.style.display = 'block';
    container.innerHTML = '';
    
    // 获取AI分类
    const classifications = await classifyTopicsWithAI(topics);
    
    // 按学科统计
    const subjectCounts = {};
    topics.forEach(topic => {
        const subjectId = classifications[topic] || 'other';
        subjectCounts[subjectId] = (subjectCounts[subjectId] || 0) + 1;
    });
    
    loading.style.display = 'none';
    
    const sorted = Object.entries(subjectCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无数据</p>';
        return;
    }
    
    const maxCount = Math.max(...sorted.map(s => s[1]), 1);
    
    container.innerHTML = sorted.map(([subjectId, count]) => {
        const width = (count / maxCount) * 100;
        const subjectName = SUBJECT_NAMES[subjectId] || subjectId;
        return `
            <div class="subject-bar">
                <span class="label">${subjectName}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${width}%"></div>
                </div>
                <span class="count">${count}</span>
            </div>
        `;
    }).join('');
}

// 显示统计详情
function showStatDetail(type) {
    const stats = getStats();
    const sessions = getAllSessions();
    const overlay = document.getElementById('statDetailOverlay');
    const title = document.getElementById('statDetailTitle');
    const summary = document.getElementById('statDetailSummary');
    const list = document.getElementById('statDetailList');
    
    const calculated = calculateStatsForDate(currentStatsDate);
    const dateName = formatDateLabel(currentStatsDate);
    
    let html = '';
    
    switch (type) {
        case 'topics':
            title.textContent = '📚 话题详情';
            summary.innerHTML = `
                <div class="big-number">${calculated.topicsCompleted}</div>
                <div class="summary-label">${dateName}完成话题</div>
                <div class="summary-sub">共学习 ${calculated.topicsStarted || Object.keys(sessions).length} 个话题</div>
            `;
            
            // 列出所有话题
            const sortedSessions = Object.entries(sessions)
                .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt));
            
            html = '<div class="detail-section-title">话题列表</div>';
            html += sortedSessions.map(([id, session]) => {
                const progress = session.knowledgeLevel || 0;
                const icon = progress >= 100 ? '✅' : progress >= 50 ? '📖' : '📚';
                const date = session.updatedAt ? new Date(session.updatedAt).toLocaleDateString('zh-CN') : '';
                return `
                    <div class="detail-item">
                        <div class="detail-icon">${icon}</div>
                        <div class="detail-info">
                            <div class="detail-title">${session.topic || '新话题'}</div>
                            <div class="detail-sub">${date}</div>
                        </div>
                        <div class="detail-value">${progress}%</div>
                    </div>
                `;
            }).join('');
            break;
            
        case 'knowledge':
            title.textContent = '💡 知识点详情';
            summary.innerHTML = `
                <div class="big-number">${calculated.knowledge}</div>
                <div class="summary-label">${dateName}累计知识点</div>
                <div class="summary-sub">平均每次获得 ${calculated.messages > 0 ? Math.round(calculated.knowledge / calculated.messages) : 0} 分</div>
            `;
            
            // 按日期显示知识增长
            const dailyKnowledge = stats.dailyKnowledge || {};
            const knowledgeDays = Object.entries(dailyKnowledge)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 30);
            
            html = '<div class="detail-section-title">每日知识增长</div>';
            if (knowledgeDays.length === 0) {
                html += '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">暂无数据</p>';
            } else {
                html += knowledgeDays.map(([date, value]) => {
                    const d = new Date(date);
                    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
                    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
                    return `
                        <div class="detail-item">
                            <div class="detail-icon">📅</div>
                            <div class="detail-info">
                                <div class="detail-title">${dateStr}</div>
                                <div class="detail-sub">${weekDay}</div>
                            </div>
                            <div class="detail-value">+${value}</div>
                        </div>
                    `;
                }).join('');
            }
            break;
            
        case 'messages':
            title.textContent = '💬 消息详情';
            summary.innerHTML = `
                <div class="big-number">${calculated.messages}</div>
                <div class="summary-label">${dateName}教学消息</div>
                <div class="summary-sub">共完成 ${calculated.topicsCompleted} 个话题</div>
            `;
            
            // 按日期显示消息数
            const dailyMessages = stats.dailyMessages || {};
            const messageDays = Object.entries(dailyMessages)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 30);
            
            html = '<div class="detail-section-title">每日消息数</div>';
            if (messageDays.length === 0) {
                html += '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">暂无数据</p>';
            } else {
                html += messageDays.map(([date, value]) => {
                    const d = new Date(date);
                    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
                    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
                    return `
                        <div class="detail-item">
                            <div class="detail-icon">💬</div>
                            <div class="detail-info">
                                <div class="detail-title">${dateStr}</div>
                                <div class="detail-sub">${weekDay}</div>
                            </div>
                            <div class="detail-value">${value}条</div>
                        </div>
                    `;
                }).join('');
            }
            break;
            
        case 'streak':
            title.textContent = '🔥 连续学习';
            const maxStreak = Math.max(stats.currentStreak || 0, stats.maxStreak || 0);
            summary.innerHTML = `
                <div class="big-number">${stats.currentStreak || 0}</div>
                <div class="summary-label">当前连续天数</div>
                <div class="summary-sub">最长连续 ${maxStreak} 天</div>
            `;
            
            // 显示最近活跃日期
            const recentDates = Object.keys(stats.dailyKnowledge || {})
                .sort((a, b) => b.localeCompare(a))
                .slice(0, 14);
            
            html = '<div class="detail-section-title">最近学习记录</div>';
            if (recentDates.length === 0) {
                html += '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">暂无学习记录</p>';
            } else {
                html += recentDates.map(date => {
                    const d = new Date(date);
                    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
                    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
                    const knowledge = (stats.dailyKnowledge || {})[date] || 0;
                    const messages = (stats.dailyMessages || {})[date] || 0;
                    return `
                        <div class="detail-item">
                            <div class="detail-icon">✅</div>
                            <div class="detail-info">
                                <div class="detail-title">${dateStr} ${weekDay}</div>
                                <div class="detail-sub">知识+${knowledge} · ${messages}条消息</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            break;
    }
    
    list.innerHTML = html;
    overlay.style.display = 'flex';
}

function closeStatDetail() {
    document.getElementById('statDetailOverlay').style.display = 'none';
}
