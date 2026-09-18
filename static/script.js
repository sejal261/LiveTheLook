async function sendMessage() {

    let input = document.getElementById("message");
    let text = input.value.strip ? input.value.strip() : input.value;
    if (text === "") return;

    let chat = document.getElementById("chatbox");
    chat.innerHTML += `<div class="user">${text}</div>`;
    input.value = "";
    chat.scrollTop = chat.scrollHeight;

    let typing = document.getElementById("typing");
    if (typing) {
        typing.style.display = "block";
    }

    try {
        let response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text
            })
        });

        let data = await response.json();
        chat.innerHTML += `<div class="bot">${data.reply}</div>`;
    } catch (e) {
        console.error(e);
        chat.innerHTML += `<div class="bot">Sorry, I encountered an error. Please try again later.</div>`;
    } finally {
        if (typing) {
            typing.style.display = "none";
        }
        chat.scrollTop = chat.scrollHeight;
    }
}

// Menu toggle handler
const menuBtn = document.getElementById("menuBtn");
const dropdown = document.getElementById("dropdown");

if (menuBtn && dropdown) {
    menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dropdown.style.display === "flex") {
            dropdown.style.display = "none";
        } else {
            dropdown.style.display = "flex";
        }
    });

    window.addEventListener("click", (e) => {
        if (!e.target.closest(".menu")) {
            dropdown.style.display = "none";
        }
    });
}