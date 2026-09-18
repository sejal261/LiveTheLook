import os
import json
import requests
from flask import current_app
from models.design import Design
from models.category import Category
from models.style import Style

KNOWLEDGE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "interior_knowledge.json")

def load_static_knowledge():
    try:
        if os.path.exists(KNOWLEDGE_PATH):
            with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading static knowledge: {e}")
    return {}

def get_db_knowledge_summary():
    try:
        designs = Design.query.order_by(Design.id.desc()).limit(10).all()
        categories = Category.query.all()
        styles = Style.query.all()

        design_summary = []
        for d in designs:
            design_summary.append({
                "id": d.id,
                "title": d.title,
                "category": d.category_name,
                "style": d.style_name,
                "description": d.description,
                "products_count": len(d.products)
            })

        return {
            "categories": [c.name for c in categories],
            "styles": [s.name for s in styles],
            "featured_designs": design_summary
        }
    except Exception as e:
        print(f"Error getting DB summary: {e}")
        return {}

def try_openai_llm(user_message, system_prompt):
    api_key = current_app.config.get("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.4,
            "max_tokens": 250
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"OpenAI API call failed: {e}")
    return None

def try_gemini_llm(user_message, system_prompt):
    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_prompt}\n\nUser Question: {user_message}"}
                    ]
                }
            ]
        }
        resp = requests.post(url, json=payload, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                return candidates[0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"Gemini API call failed: {e}")
    return None

def try_ollama_llm(user_message, system_prompt):
    try:
        # Fast check to see if Ollama server is listening on port 11434
        check = requests.get("http://127.0.0.1:11434/api/tags", timeout=1.0)
        if check.status_code != 200:
            return None

        import ollama
        resp = ollama.chat(
            model="llama3.2:1b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            options={"temperature": 0.3, "num_predict": 180}
        )
        return resp["message"]["content"].strip()
    except Exception as e:
        print(f"Ollama local LLM unavailable: {e}")
    return None

def generate_fallback_response(user_message):
    msg = user_message.lower()
    static_k = load_static_knowledge()
    db_k = get_db_knowledge_summary()

    matched_topics = []
    for key, val in static_k.items():
        if key.replace("_", " ") in msg:
            if isinstance(val, str):
                matched_topics.append(val)
            elif isinstance(val, dict):
                matched_topics.append(json.dumps(val))

    # Check for matching designs in database
    matching_designs = []
    if "featured_designs" in db_k:
        for d in db_k["featured_designs"]:
            if d["category"].lower() in msg or d["style"].lower() in msg or any(w in d["title"].lower() for w in msg.split()):
                matching_designs.append(d)

    rec = "Focus on cohesive color palettes, layered lighting, functional layout, and scale-appropriate furniture."
    if "small" in msg or "bedroom" in msg:
        rec = "Maximize vertical space, use neutral base colors, and choose furniture with built-in storage."
    elif "kitchen" in msg:
        rec = "Maintain the ergonomic work triangle (sink, stove, fridge) and optimize task lighting."
    elif "living" in msg:
        rec = "Anchor the space with a comfortable seating layout and a natural focal point."
    elif "light" in msg:
        rec = "Combine ambient, task, and accent lighting at varying heights to add warmth."

    steps = [
        "Select a clear focal point and build your layout around it.",
        "Use warm ambient lighting combined with task lamps for depth.",
        "Incorporate natural materials like wood, jute, or brass for texture."
    ]

    avoid = "- Avoid overcrowding with oversized furniture or excessive dark tones."

    db_mention = ""
    if matching_designs:
        d = matching_designs[0]
        db_mention = f"\n\nRECOMMENDED DESIGN ON OUR WEBSITE:\nCheck out '{d['title']}' ({d['category']} - {d['style']} style)."

    return f"RECOMMENDATION:\n{rec}\n\nSTEPS:\n1. {steps[0]}\n2. {steps[1]}\n3. {steps[2]}\n\nAVOID:\n{avoid}{db_mention}"

def get_chatbot_response(user_message):
    user_message = (user_message or "").strip()
    if not user_message:
        return "Please ask me an interior design question or inquire about our featured room designs!"

    static_knowledge = load_static_knowledge()
    db_knowledge = get_db_knowledge_summary()

    system_prompt = (
        "You are an expert interior design assistant for our website platform. "
        "Use the supplied knowledge base and website design catalogue to answer questions clearly and concisely.\n\n"
        "Always format your response with these exact headers:\n"
        "RECOMMENDATION:\n"
        "One short main recommendation sentence.\n\n"
        "STEPS:\n"
        "1. First practical action.\n"
        "2. Second practical action.\n"
        "3. Third practical action.\n\n"
        "AVOID:\n"
        "- One or two things to avoid.\n\n"
        "Keep the total answer under 130 words. Simple, warm, and highly practical language.\n\n"
        f"Static Knowledge:\n{json.dumps(static_knowledge, indent=2)}\n\n"
        f"Live Platform Designs Catalogue:\n{json.dumps(db_knowledge, indent=2)}"
    )

    # 1. Try Gemini API if key exists
    llm_resp = try_gemini_llm(user_message, system_prompt)
    if llm_resp:
        return llm_resp

    # 2. Try OpenAI API if key exists
    llm_resp = try_openai_llm(user_message, system_prompt)
    if llm_resp:
        return llm_resp

    # 3. Try Ollama local model if available
    llm_resp = try_ollama_llm(user_message, system_prompt)
    if llm_resp:
        return llm_resp

    # 4. Clean rule-based fallback
    return generate_fallback_response(user_message)
