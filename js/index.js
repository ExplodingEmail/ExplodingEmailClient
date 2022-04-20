
class OpCode {
    static INVALID_TOKEN = 0;                //server -> client
    static GENERATION_FAILURE = 1;           //server -> client
    static HERE_IS_YOUR_EMAIL_AND_TOKEN = 2; //server -> client
    static STATISTICS_REQUEST_RESPONSE = 3;  //server -> client
    static INVALID_URI = 4;                  //server -> client
    static RESUME_SUCCESS = 5;               //server -> client
    static EMAIL_INCOMING = 6;               //server -> client
    static DELETE_INBOX = 10;                //client -> server
}

/**
 * Remove all script, img, and iframe tags from the given string.
 * @param input {string} The string to remove the tags from.
 */
function stripTags(input) {
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<[\/\!]*?[^<>]*?>/gi, '')
                .replace(/<style[^>]*>.*?<\/style>/gi, '')
                .replace(/<![\s\S]*?--[ \t\n\r]*>/gi, '')
                .replace(/<img[^>]*>/gi, '')
                .replace(/<iframe[^>]*>/gi, '');
}

const URL_BASE = "wss://gateway.exploding.email";

//make a ws connection to /generate
//if there is an email and token stored in localStorage, resume the session
//otherwise, generate a new email and token

let stored_token = localStorage.getItem("token");
let stored_email = localStorage.getItem("email");

let ws;

setTimeout(() => {
    if(stored_email && stored_token) {
        ws = new WebSocket(URL_BASE + "/auth/" + stored_token);
    } else {
        ws = new WebSocket(URL_BASE + "/generate");
    }
    
    ws.onopen = function() {
        console.log("Connected to server");
    };
    
    ws.onmessage = function(event) {
        const content = JSON.parse(event.data);
        const op = content.op;
        
        switch(op) {
            case OpCode.INVALID_TOKEN: {
                //if the token is invalid, clear localStorage and refresh
                localStorage.clear();
                return window.location.reload();
            }
            case OpCode.GENERATION_FAILURE: {
                //if the server cannot generate an email, alert the user.
                return alert("Failed to generate email (this is a server error, try again later).");
            }
            case OpCode.HERE_IS_YOUR_EMAIL_AND_TOKEN: {
                //if the server sends an email, store it in localStorage
                localStorage.setItem("email", content.email);
                localStorage.setItem("token", content.token);
                
                //set the email in the email field
                document.getElementById("email").value = content.email;
                
                return;
            }
            case OpCode.STATISTICS_REQUEST_RESPONSE: {
                //if the server sends statistics, set content.statistics.emails_received to the "stats" element
                document.getElementById("stats").innerText = content.statistics.emails_received;
                document.getElementById("inboxes").innerText = content.statistics.clients;
                return;
            }
            case OpCode.INVALID_URI: {
                //if the server sends an invalid uri, alert the user
                return alert("Invalid URI");
            }
            case OpCode.RESUME_SUCCESS: {
                //if the server sends a success message, set the email input to the one in localStorage
                document.getElementById("email").value = localStorage.getItem("email");
                return;
            }
            case OpCode.EMAIL_INCOMING: {
                //if the server sends an email, alert the user
                createEmailElement(content.data.from, content.data.subject, content.data.body, content.data.date, content.data.ip);
            }
            
        }
    };
}, 300);

//copy the text from the email input to the clipboard
function copy() {
    const email = document.getElementById("email");
    email.select();
    email.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(email.value);
    
    //change the `copy_button` text to a checkmark for 3 seconds
    const copy_button = document.getElementById("copy_button");
    copy_button.innerHTML = "✓ Copied!";
    setTimeout(function() {
        copy_button.innerHTML = "Copy";
    }, 3000);
}

function regenerate() {
    //delete the old email by sending a message to the socket with OpCode.DELETE_INBOX
    const token = localStorage.getItem("token");
    ws.send(JSON.stringify({
        op: OpCode.DELETE_INBOX,
        token: token,
    }));
    localStorage.clear();
    window.location.reload();
    
}

setTimeout(() => {
    const ua = navigator.userAgent.toLowerCase();
    
    if(ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod") || ua.includes("android")) {
        document.getElementById("mobile_warning").hidden = false;
    }
}, 1000);


function topnav_resize() {
    const x = document.getElementById("topnav");
    x.className = x.className === "" ? "responsive" : "";
}

function createEmailElement(sender, subject, body, date) {
    const email = document.createElement("div");
    email.className = "email";
    email.innerHTML = `<h2>From: ${sender}</h2><h2>Subject: ${subject}</h2><p>Click to expand</p><div id="email_display"></div>`;
    //create a hidden div to hold the body of the email
    const email_display = document.createElement("div");
    email_display.id = "email_display";
    email_display.style.display = "none";
    email_display.innerHTML = `<h5>Date: ${new Date(date).toISOString()}</h5><p>${stripTags(body)}</p>`;
    email.onclick = () => {
        email_display.style.display = "block";
    };
    email.appendChild(email_display);
    const hr = document.createElement("hr");
    email.appendChild(hr);
    document.getElementById("emails_container").prepend(email);
}
