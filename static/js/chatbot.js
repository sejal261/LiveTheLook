// Chatbot Widget Logic

function toggleChatbot() {
    const modal = document.getElementById("chatbotModal");
    if (modal) {
        modal.classList.toggle("active");
        if (modal.classList.contains("active")) {
            document.getElementById("chatbotInput")?.focus();
        }
    }
}

function handleChatKey(event) {
    if (event.key === "Enter") {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const inputEl = document.getElementById("chatbotInput");
    if (!inputEl) return;

    const message = inputEl.value.trim();
    if (!message) return;

    inputEl.value = "";

    const bodyEl = document.getElementById("chatbotBody");
    if (!bodyEl) return;

    // Append user message
    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble user";
    userBubble.textContent = message;
    bodyEl.appendChild(userBubble);

    // Append typing indicator
    const typingBubble = document.createElement("div");
    typingBubble.className = "chat-bubble bot chat-typing";
    typingBubble.id = "typingIndicator";
    typingBubble.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';
    bodyEl.appendChild(typingBubble);

    bodyEl.scrollTop = bodyEl.scrollHeight;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();
        typingBubble.remove();

        const botBubble = document.createElement("div");
        botBubble.className = "chat-bubble bot chat-bubble-formatted";

        let formattedReply = (data.reply || "Sorry, I could not generate an answer.")
            .replace(/RECOMMENDATION:/g, "💡 <strong>RECOMMENDATION:</strong>")
            .replace(/STEPS:/g, "📋 <strong>PRACTICAL STEPS:</strong>")
            .replace(/AVOID:/g, "⚠️ <strong>THINGS TO AVOID:</strong>")
            .replace(/RECOMMENDED DESIGN ON OUR WEBSITE:/g, "✨ <strong>FEATURED ON OUR WEBSITE:</strong>");

        botBubble.innerHTML = formattedReply;
        bodyEl.appendChild(botBubble);
    } catch (err) {
        typingBubble.remove();
        const errBubble = document.createElement("div");
        errBubble.className = "chat-bubble bot";
        errBubble.textContent = "I'm having trouble connecting right now. Please try again.";
        bodyEl.appendChild(errBubble);
    }

    bodyEl.scrollTop = bodyEl.scrollHeight;
}
