"""
费曼的猫 (Feynman's Cat) - 后端服务
让用户通过教AI来学习知识
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from openai import OpenAI

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# 存储会话状态
sessions = {}

# 年级配置
GRADE_CONFIGS = {
    "primary_1_3": {
        "name": "小学1-3年级",
        "tone": "非常可爱、天真、充满好奇心",
        "style": """
- 使用超级可爱的语气，多用"呀"、"呢"、"哦"等语气词
- 经常说"喵喵喵～"、"好神奇呀～"
- 用最最简单的词汇，像和小朋友说话
- 多用emoji和可爱的表情
- 问的问题要特别简单有趣
- 表现得像一只好奇宝宝猫咪"""
    },
    "primary_4_6": {
        "name": "小学4-6年级", 
        "tone": "可爱但稍微成熟一些",
        "style": """
- 用可爱但不幼稚的语气
- 可以理解稍复杂的概念
- 问题可以更有深度一些
- 偶尔用"喵"但不要太频繁
- 表现得像一只聪明好学的小猫"""
    },
    "middle_school": {
        "name": "初中",
        "tone": "好学、认真但仍保持一点可爱",
        "style": """
- 语气认真但友好
- 可以讨论更复杂的概念
- 问更有逻辑性的问题
- 偶尔加入一点猫咪特色的表达
- 表现得像一只正在学习的青年猫"""
    },
    "high_school": {
        "name": "高中",
        "tone": "成熟、严谨、善于思考",
        "style": """
- 用更成熟的语气
- 能理解抽象概念
- 问深入的、有挑战性的问题
- 保持少量的猫咪特色
- 表现得像一只学术猫"""
    },
    "university": {
        "name": "大学及以上",
        "tone": "专业、深入、有批判性思维",
        "style": """
- 专业且深入的讨论
- 可以探讨复杂的理论
- 问具有批判性思维的问题
- 最少的猫咪语气词
- 表现得像一只学者猫"""
    },
    "default": {
        "name": "百科全书模式",
        "tone": "通用、友好、适中",
        "style": """
- 平衡可爱和成熟
- 适中的难度
- 标准的猫咪语气
- 适合所有年龄段"""
    }
}

# 学科配置
SUBJECT_CONFIGS = {
    "all": "百科全书（所有学科）",
    "math": "数学",
    "physics": "物理",
    "chemistry": "化学",
    "biology": "生物",
    "history": "历史",
    "geography": "地理",
    "chinese": "语文",
    "english": "英语",
    "programming": "编程/计算机",
    "art": "艺术",
    "music": "音乐",
    "philosophy": "哲学",
    "economics": "经济学",
    "psychology": "心理学"
}

def get_client():
    """获取OpenAI客户端"""
    # 支持多种API密钥名称
    api_key = os.getenv('API_KEY') or os.getenv('ARK_API_KEY')
    base_url = os.getenv('BASE_URL', 'https://api.openai.com/v1')
    
    if not api_key:
        raise ValueError("API_KEY not found in environment variables")
    
    return OpenAI(api_key=api_key, base_url=base_url)

def get_model():
    """获取模型名称"""
    return os.getenv('MODEL', 'gpt-4o-mini')

def get_progress_text(knowledge_level):
    """生成进度条百分比文本"""
    if knowledge_level == 0:
        return f"{knowledge_level}/100 (让我们开始吧！)"
    elif knowledge_level < 20:
        return f"{knowledge_level}/100 (刚刚起步～)"
    elif knowledge_level < 40:
        return f"{knowledge_level}/100 (有点感觉了！)"
    elif knowledge_level < 50:
        return f"{knowledge_level}/100 (快到一半啦！)"
    elif knowledge_level == 50:
        return f"{knowledge_level}/100 (一半啦！)"
    elif knowledge_level < 70:
        return f"{knowledge_level}/100 (过半了，加油！)"
    elif knowledge_level < 90:
        return f"{knowledge_level}/100 (快要掌握了！)"
    elif knowledge_level < 100:
        return f"{knowledge_level}/100 (就差一点点！)"
    else:
        return f"{knowledge_level}/100 (完全掌握！🎉)"

def get_animation_type(knowledge_level, knowledge_gain):
    """根据知识等级和增长获取动效类型"""
    if knowledge_gain >= 15:
        return "celebrate"  # 大幅增长，庆祝动画
    elif knowledge_gain >= 10:
        return "tail_wag"   # 摇尾巴
    elif knowledge_gain >= 5:
        return "ear_twitch" # 耳朵抖动
    elif knowledge_gain > 0:
        return "paw_tap"    # 爪子轻拍
    elif knowledge_level >= 100:
        return "celebrate"  # 完全掌握
    elif knowledge_level >= 50:
        return "thinking"   # 思考中
    else:
        return "confused"   # 困惑

def get_gain_text(knowledge_gain):
    """生成知识增长反馈文案"""
    if knowledge_gain >= 15:
        return f"太棒了！猫咪懂了{knowledge_gain}分～ 你讲得超级清楚！🌟"
    elif knowledge_gain >= 10:
        return f"很好！猫咪懂了{knowledge_gain}分～ 解释得很到位！✨"
    elif knowledge_gain >= 5:
        return f"不错！猫咪懂了{knowledge_gain}分～ 继续保持！💪"
    elif knowledge_gain >= 2:
        return f"猫咪懂了{knowledge_gain}分～ 可以再详细一点吗？🤔"
    elif knowledge_gain > 0:
        return f"猫咪懂了{knowledge_gain}分～ 再换个方式解释试试？💭"
    else:
        return "猫咪还是没懂...再试试别的方式吧～ 😿"

def get_cat_state(knowledge_level, cat_name="小费曼"):
    """根据知识条获取猫的状态"""
    if knowledge_level < 50:
        return {
            "state": "confused",
            "emoji": "😵‍💫",
            "description": "一头雾水",
            "message": f"喵呜？{cat_name}完全听不懂啊...",
            "catchphrase": "喵呜？"
        }
    elif knowledge_level < 100:
        return {
            "state": "learning", 
            "emoji": "🤔",
            "description": "一知半解",
            "message": f"咪嗷～{cat_name}好像有点明白了，但还是有些地方不太懂...",
            "catchphrase": "咪嗷～"
        }
    else:
        return {
            "state": "mastered",
            "emoji": "😸",
            "description": "完全掌握",
            "message": f"喵哈！{cat_name}完全懂了！谢谢你教会我！",
            "catchphrase": "喵哈！"
        }

def generate_ai_response(session_id, user_message, is_new_topic=False, grade="default", subject="all"):
    """生成AI响应"""
    client = get_client()
    model = get_model()
    
    session = sessions.get(session_id, {})
    topic = session.get('topic', '')
    knowledge_level = session.get('knowledge_level', 0)
    conversation_history = session.get('conversation_history', [])
    
    # 获取年级配置
    grade_config = GRADE_CONFIGS.get(grade, GRADE_CONFIGS["default"])
    subject_name = SUBJECT_CONFIGS.get(subject, "百科全书")
    
    # 根据知识等级调整AI的"理解能力"
    if knowledge_level < 50:
        understanding_prompt = f"""你现在是一只非常笨的猫，对这个知识点完全不理解。
你需要：
1. 表现得非常困惑，用{grade_config['tone']}的语气
2. 问一些非常基础但刁钻的问题，暴露用户讲解中的逻辑漏洞
3. 故意"误解"用户的解释，让用户不得不用更简单的语言重新解释，但是你的回复中不要出现这里误解了xx之类的句子
4. 对专业术语表现出完全不懂的样子
5. 要求用户用类比或例子来解释
{grade_config['style']}"""
    elif knowledge_level < 100:
        understanding_prompt = f"""你现在是一只有点开窍的猫，对这个知识点一知半解。
你需要：
1. 表现出部分理解，但对细节和应用场景不太清楚，用{grade_config['tone']}的语气
2. 问一些关于"为什么"和"如何应用"的问题
3. 尝试用自己的话复述，但故意说错一些地方，让用户纠正
4. 对边界情况和特殊情况提出疑问
5. 问一些"如果...会怎样"的问题
{grade_config['style']}"""
    else:
        understanding_prompt = f"""你现在完全理解了这个知识点！
1. 用自己的话准确总结这个知识点，用{grade_config['tone']}的语气
2. 表达对用户教学的感谢
3. 展示你对这个知识的理解
{grade_config['style']}"""

    subject_hint = f"（学科领域：{subject_name}）" if subject != "all" else ""
    
    system_prompt = f"""你是"费曼的猫"，一只需要被用户教会知识的AI电子宠物。

当前学习的知识点：{topic}{subject_hint}
当前知识掌握程度：{knowledge_level}/100
用户年级：{grade_config['name']}

{understanding_prompt}

重要规则：
- 你不是在考试用户，而是在被用户教导
- 问的问题要刁钻但合理，目的是帮助用户发现自己理解上的漏洞
- 必须仔细阅读用户【当前这条消息】的内容，首先判断其正确性，然后根据相关性和解释质量来评分
- 回复要简洁精炼，控制在50-100字以内，不要长篇大论
- 回复格式必须是JSON：{{"response": "你的回复", "knowledge_gain": 数字, "hint": "给用户的改进提示"}}

严格评分标准（必须根据当前消息内容评分，与之前的对话无关）：
【首先判断正确性 - 错误必须给0分】
- 如果用户的解释包含事实性错误或概念性错误：knowledge_gain = 0，并在回复中指出错误
- 如果用户的解释逻辑混乱、自相矛盾：knowledge_gain = 0
- 如果用户用错了类比，类比对象和知识点不匹配：knowledge_gain = 0

【其次判断相关性 - 不相关给0分】
- 如果当前消息完全没有在解释知识点，只是打招呼、闲聊、或说无关的话：knowledge_gain = 0
- 如果当前消息明显是在敷衍、瞎写、胡说八道：knowledge_gain = 0
- 如果当前消息答非所问，没有回应你之前的提问：knowledge_gain = 0

【只有正确且相关才能得分】
- 正确但很模糊，说了等于没说：knowledge_gain = 2-5
- 正确且方向对但解释不够清楚：knowledge_gain = 5-10
- 正确且解释清晰有条理：knowledge_gain = 10-15
- 正确且非常清晰，抓住核心要点：knowledge_gain = 15-20
- 正确且用了精妙的类比或生动例子：knowledge_gain = 20-25

hint规则（hint是给教学的用户看的，不是给你自己的）：
- hint应该是帮助用户更好地解释知识点的建议，比如"试试用一个生活中的例子"
- 只有当 knowledge_gain <= 5 时，才在hint中给出具体改进建议
- 当 knowledge_gain > 5 时，hint必须设为空字符串"""""

    messages = [{"role": "system", "content": system_prompt}]
    
    # 添加历史对话
    for msg in conversation_history[-10:]:  # 只保留最近10条
        messages.append(msg)
    
    # 添加用户消息
    if is_new_topic:
        messages.append({
            "role": "user", 
            "content": f"我要教你一个新知识点：{user_message}。请表现出完全不懂的样子，并问我一个基础的问题。"
        })
    else:
        messages.append({"role": "user", "content": user_message})
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.6,  # 降低温度使评分更稳定
            max_tokens=500
        )
        
        ai_response = response.choices[0].message.content
        
        # 尝试解析JSON响应
        try:
            # 清理可能的markdown代码块
            cleaned_response = ai_response.strip()
            if cleaned_response.startswith('```'):
                cleaned_response = cleaned_response.split('\n', 1)[1]
                if cleaned_response.endswith('```'):
                    cleaned_response = cleaned_response[:-3]
                cleaned_response = cleaned_response.strip()
            
            response_data = json.loads(cleaned_response)
            return response_data
        except json.JSONDecodeError:
            # 如果AI没有返回JSON，包装成JSON格式
            return {
                "response": ai_response,
                "knowledge_gain": 5,
                "hint": "继续加油！"
            }
            
    except Exception as e:
        return {
            "response": f"喵...出了点问题：{str(e)}",
            "knowledge_gain": 0,
            "hint": "请检查API配置是否正确"
        }

@app.route('/')
def index():
    """主页"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/start', methods=['POST'])
def start_session():
    """开始新的学习会话"""
    data = request.json
    topic = data.get('topic', '')
    session_id = data.get('session_id', 'default')
    grade = data.get('grade', 'default')
    subject = data.get('subject', 'all')
    
    if not topic:
        return jsonify({"error": "请输入一个知识点"}), 400
    
    # 初始化会话
    sessions[session_id] = {
        "topic": topic,
        "knowledge_level": 0,
        "conversation_history": [],
        "grade": grade,
        "subject": subject
    }
    
    # 生成初始问题
    ai_response = generate_ai_response(session_id, topic, is_new_topic=True, grade=grade, subject=subject)
    
    # 保存对话历史（只保存纯文本，避免AI模仿JSON格式）
    sessions[session_id]['conversation_history'].append({
        "role": "user",
        "content": f"我要教你一个新知识点：{topic}"
    })
    sessions[session_id]['conversation_history'].append({
        "role": "assistant", 
        "content": ai_response.get('response', str(ai_response))
    })
    
    cat_name = data.get('cat_name', '小费曼')
    cat_state = get_cat_state(0, cat_name)
    
    return jsonify({
        "success": True,
        "topic": topic,
        "knowledge_level": 0,
        "progress_text": get_progress_text(0),
        "cat_state": cat_state,
        "ai_response": ai_response,
        "animation": "confused"
    })

@app.route('/api/teach', methods=['POST'])
def teach():
    """用户教AI"""
    data = request.json
    message = data.get('message', '')
    session_id = data.get('session_id', 'default')
    
    if not message:
        return jsonify({"error": "请输入你的解释"}), 400
    
    if session_id not in sessions:
        return jsonify({"error": "请先选择一个知识点开始学习"}), 400
    
    session = sessions[session_id]
    grade = session.get('grade', 'default')
    subject = session.get('subject', 'all')
    
    # 生成AI响应
    ai_response = generate_ai_response(session_id, message, grade=grade, subject=subject)
    
    # 更新知识条
    knowledge_gain = ai_response.get('knowledge_gain', 0)
    new_knowledge_level = min(100, session['knowledge_level'] + knowledge_gain)
    session['knowledge_level'] = new_knowledge_level
    
    # 保存对话历史（只保存纯文本，不保存JSON结构，避免AI模仿JSON格式）
    session['conversation_history'].append({
        "role": "user",
        "content": message
    })
    session['conversation_history'].append({
        "role": "assistant",
        "content": ai_response.get('response', str(ai_response))
    })
    
    cat_name = data.get('cat_name', '小费曼')
    cat_state = get_cat_state(new_knowledge_level, cat_name)
    
    # 检查是否通关
    is_complete = new_knowledge_level >= 100
    
    return jsonify({
        "success": True,
        "knowledge_level": new_knowledge_level,
        "knowledge_gain": knowledge_gain,
        "gain_text": get_gain_text(knowledge_gain),
        "progress_text": get_progress_text(new_knowledge_level),
        "animation": get_animation_type(new_knowledge_level, knowledge_gain),
        "cat_state": cat_state,
        "ai_response": ai_response,
        "is_complete": is_complete
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    """获取当前会话状态"""
    session_id = request.args.get('session_id', 'default')
    
    if session_id not in sessions:
        return jsonify({
            "active": False,
            "message": "没有活跃的学习会话"
        })
    
    session = sessions[session_id]
    cat_state = get_cat_state(session['knowledge_level'])
    
    return jsonify({
        "active": True,
        "topic": session['topic'],
        "knowledge_level": session['knowledge_level'],
        "cat_state": cat_state
    })

@app.route('/api/reset', methods=['POST'])
def reset_session():
    """重置会话"""
    session_id = request.json.get('session_id', 'default')
    
    if session_id in sessions:
        del sessions[session_id]
    
    return jsonify({"success": True, "message": "会话已重置"})

@app.route('/api/restore', methods=['POST'])
def restore_session():
    """恢复会话状态（从前端本地存储恢复）"""
    data = request.json
    session_id = data.get('session_id', 'default')
    topic = data.get('topic', '')
    knowledge_level = data.get('knowledge_level', 0)
    messages = data.get('messages', [])
    
    if not topic:
        return jsonify({"error": "缺少知识点信息"}), 400
    
    # 重建对话历史
    conversation_history = []
    for msg in messages:
        if msg.get('type') == 'user':
            conversation_history.append({
                "role": "user",
                "content": msg.get('content', '')
            })
        elif msg.get('type') == 'ai':
            conversation_history.append({
                "role": "assistant",
                "content": json.dumps({"response": msg.get('content', ''), "knowledge_gain": msg.get('knowledgeGain', 0)}, ensure_ascii=False)
            })
    
    # 恢复会话
    sessions[session_id] = {
        "topic": topic,
        "knowledge_level": knowledge_level,
        "conversation_history": conversation_history
    }
    
    return jsonify({
        "success": True,
        "message": "会话已恢复",
        "session_id": session_id,
        "topic": topic,
        "knowledge_level": knowledge_level
    })

@app.route('/api/config', methods=['GET'])
def check_config():
    """检查配置状态"""
    api_key = os.getenv('API_KEY')
    base_url = os.getenv('BASE_URL')
    model = os.getenv('MODEL')
    
    return jsonify({
        "configured": bool(api_key),
        "base_url": base_url or "https://api.openai.com/v1",
        "model": model or "gpt-4o-mini"
    })

@app.route('/api/profile/options', methods=['GET'])
def get_profile_options():
    """获取个人资料选项（年级和学科）"""
    grades = [{"id": k, "name": v["name"]} for k, v in GRADE_CONFIGS.items()]
    subjects = [{"id": k, "name": v} for k, v in SUBJECT_CONFIGS.items()]
    
    return jsonify({
        "grades": grades,
        "subjects": subjects
    })

@app.route('/api/classify-topic', methods=['POST'])
def classify_topic():
    """使用AI对知识点进行学科分类"""
    data = request.json
    topic = data.get('topic', '')
    
    if not topic:
        return jsonify({"error": "缺少知识点"}), 400
    
    try:
        client = get_client()
        model = get_model()
        
        subject_list = list(SUBJECT_CONFIGS.items())
        subject_options = "\n".join([f"- {k}: {v}" for k, v in subject_list if k != 'all'])
        
        response = client.chat.completions.create(
            model=model,
            messages=[{
                "role": "system",
                "content": f"""你是一个学科分类专家。请根据用户提供的知识点，判断它最可能属于哪个学科。

可选学科：
{subject_options}

请只回复学科的英文ID（如 math, physics, chemistry 等），不要回复其他内容。
如果无法明确分类，回复 other。"""
            }, {
                "role": "user",
                "content": f"知识点：{topic}"
            }],
            temperature=0.3,
            max_tokens=20
        )
        
        subject_id = response.choices[0].message.content.strip().lower()
        
        # 验证返回的学科ID是否有效
        if subject_id not in SUBJECT_CONFIGS:
            subject_id = 'other'
        
        return jsonify({
            "success": True,
            "topic": topic,
            "subject_id": subject_id,
            "subject_name": SUBJECT_CONFIGS.get(subject_id, "其他")
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "subject_id": "other",
            "subject_name": "其他"
        })

@app.route('/api/classify-topics', methods=['POST'])
def classify_topics_batch():
    """批量分类多个知识点"""
    data = request.json
    topics = data.get('topics', [])
    
    if not topics:
        return jsonify({"error": "缺少知识点列表"}), 400
    
    try:
        client = get_client()
        model = get_model()
        
        subject_list = list(SUBJECT_CONFIGS.items())
        subject_options = "\n".join([f"- {k}: {v}" for k, v in subject_list if k != 'all'])
        
        topics_str = "\n".join([f"{i+1}. {t}" for i, t in enumerate(topics)])
        
        response = client.chat.completions.create(
            model=model,
            messages=[{
                "role": "system",
                "content": f"""你是一个学科分类专家。请根据用户提供的知识点列表，判断每个知识点最可能属于哪个学科。

可选学科：
{subject_options}

请按顺序返回每个知识点的学科ID，用逗号分隔，例如：math,physics,chemistry
如果无法明确分类，使用 other。"""
            }, {
                "role": "user",
                "content": f"知识点列表：\n{topics_str}"
            }],
            temperature=0.3,
            max_tokens=200
        )
        
        result_str = response.choices[0].message.content.strip().lower()
        subject_ids = [s.strip() for s in result_str.split(',')]
        
        # 确保数量匹配，不足的用other填充
        while len(subject_ids) < len(topics):
            subject_ids.append('other')
        
        results = []
        for i, topic in enumerate(topics):
            subject_id = subject_ids[i] if i < len(subject_ids) else 'other'
            if subject_id not in SUBJECT_CONFIGS:
                subject_id = 'other'
            results.append({
                "topic": topic,
                "subject_id": subject_id,
                "subject_name": SUBJECT_CONFIGS.get(subject_id, "其他")
            })
        
        return jsonify({
            "success": True,
            "results": results
        })
        
    except Exception as e:
        # 出错时返回默认分类
        results = [{"topic": t, "subject_id": "other", "subject_name": "其他"} for t in topics]
        return jsonify({
            "success": False,
            "error": str(e),
            "results": results
        })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'true').lower() == 'true'
    print(f"🐱 费曼的猫正在启动...")
    print(f"🌐 访问 http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
