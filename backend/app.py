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

def generate_ai_response(session_id, user_message, is_new_topic=False):
    """生成AI响应"""
    client = get_client()
    model = get_model()
    
    session = sessions.get(session_id, {})
    topic = session.get('topic', '')
    knowledge_level = session.get('knowledge_level', 0)
    conversation_history = session.get('conversation_history', [])
    
    # 根据知识等级调整AI的"理解能力"
    if knowledge_level < 50:
        understanding_prompt = """你现在是一只非常笨的猫，对这个知识点完全不理解。
你需要：
1. 表现得非常困惑，经常说"喵？"
2. 问一些非常基础但刁钻的问题，暴露用户讲解中的逻辑漏洞
3. 故意"误解"用户的解释，让用户不得不用更简单的语言重新解释，但是你的回复中不要出现这里误解了xx之类的句子
4. 对专业术语表现出完全不懂的样子
5. 要求用户用类比或例子来解释"""
    elif knowledge_level < 100:
        understanding_prompt = """你现在是一只有点开窍的猫，对这个知识点一知半解。
你需要：
1. 表现出部分理解，但对细节和应用场景不太清楚
2. 问一些关于"为什么"和"如何应用"的问题
3. 尝试用自己的话复述，但故意说错一些地方，让用户纠正
4. 对边界情况和特殊情况提出疑问
5. 问一些"如果...会怎样"的问题"""
    else:
        understanding_prompt = """你现在完全理解了这个知识点！
1. 用自己的话准确总结这个知识点
2. 表达对用户教学的感谢
3. 展示你对这个知识的理解"""

    system_prompt = f"""你是"费曼的猫"，一只需要被用户教会知识的AI电子宠物。

当前学习的知识点：{topic}
当前知识掌握程度：{knowledge_level}/100

{understanding_prompt}

重要规则：
- 你不是在考试用户，而是在被用户教导
- 用可爱的猫咪语气说话，适当加入"喵"等词
- 问的问题要刁钻但合理，目的是帮助用户发现自己理解上的漏洞
- 每次回复后，根据用户解释的质量给出知识增长建议（0-25分）
- 回复格式必须是JSON：{{"response": "你的回复", "knowledge_gain": 数字, "hint": "给用户的小提示"}}

评分标准（要大方给分，让用户有成就感）：
- 用类比或生动例子解释：knowledge_gain = 20-25
- 非常清晰有逻辑，抓住核心要点：knowledge_gain = 15-20
- 比较清晰，有条理：knowledge_gain = 10-15  
- 有点模糊但方向正确：knowledge_gain = 5-10
- 很模糊或有错误：knowledge_gain = 2-5"""

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
            temperature=0.8,
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
    
    if not topic:
        return jsonify({"error": "请输入一个知识点"}), 400
    
    # 初始化会话
    sessions[session_id] = {
        "topic": topic,
        "knowledge_level": 0,
        "conversation_history": []
    }
    
    # 生成初始问题
    ai_response = generate_ai_response(session_id, topic, is_new_topic=True)
    
    # 保存对话历史
    sessions[session_id]['conversation_history'].append({
        "role": "user",
        "content": f"我要教你一个新知识点：{topic}"
    })
    sessions[session_id]['conversation_history'].append({
        "role": "assistant", 
        "content": json.dumps(ai_response, ensure_ascii=False)
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
    
    # 生成AI响应
    ai_response = generate_ai_response(session_id, message)
    
    # 更新知识条
    knowledge_gain = ai_response.get('knowledge_gain', 0)
    new_knowledge_level = min(100, session['knowledge_level'] + knowledge_gain)
    session['knowledge_level'] = new_knowledge_level
    
    # 保存对话历史
    session['conversation_history'].append({
        "role": "user",
        "content": message
    })
    session['conversation_history'].append({
        "role": "assistant",
        "content": json.dumps(ai_response, ensure_ascii=False)
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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'true').lower() == 'true'
    print(f"🐱 费曼的猫正在启动...")
    print(f"🌐 访问 http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
