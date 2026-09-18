import json
import ollama
from knowledge import load_knowledge

MODEL_NAME = "llama3.2:1b"


def get_response(user_message):
    user_message = (user_message or "").strip()

    if not user_message:
        return "Please ask me an interior-design question."

    try:
        knowledge = load_knowledge()

        response = ollama.chat(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful interior-design assistant. "
                        "Use the supplied knowledge. Give a concise answer in this exact format:\n\n"
                        "RECOMMENDATION:\n"
                        "One short sentence.\n\n"
                        "STEPS:\n"
                        "1. First practical action.\n"
                        "2. Second practical action.\n"
                        "3. Third practical action.\n\n"
                        "AVOID:\n"
                        "- One or two things to avoid.\n\n"
                        "Use simple language. Keep the complete answer under 120 words. "
                        "Do not add introductions, conclusions, or extra paragraphs.\n\n"
                        f"Interior-design knowledge:\n{json.dumps(knowledge, indent=2)}"
                    ),
                },
                {
                    "role": "user",
                    "content": user_message,
                },
            ],
            options={
                "temperature": 0.3,
                "num_predict": 180,
            },
        )

        return response["message"]["content"].strip()

    except Exception as error:
        print(f"Ollama error: {error}")
        return "I cannot connect to the local design assistant right now."