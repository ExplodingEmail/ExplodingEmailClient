
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

//html_mode: true to display html, false to display plain text
//since this could cause potential privacy issues, default to plain text
let html_mode = false;

/**
 * Remove all script, img, and iframe tags from the given string.
 * @param input {string} The string to remove the tags from.
 */
function stripTags(input) {
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<[\/\!]*?[^<>]*?>/gi, '')
                .replace(/<style[^>]*>.*?<\/style>/gi, '')
                .replace(/<![\s\S]*?--[ \t\n\r]*>/gi, '')
                .replace(/<iframe[^>]*>/gi, '');
}

function noHTML(input) {
    //remove all < and > replace with &lt; and &gt;
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const URL_BASE = "wss://gateway.exploding.email";

//make a ws connection to /generate
//if there is an email and token stored in localStorage, resume the session
//otherwise, generate a new email and token

let stored_token = localStorage.getItem("token");
let stored_email = localStorage.getItem("email");

let ws;

let expired = false;
let expiration_time = "(loading)";

setTimeout(() => {
    if(stored_email && stored_token) {
        ws = new WebSocket(URL_BASE + "/auth/" + stored_token);
    } else {
        ws = new WebSocket(URL_BASE + "/generate");
    }
    
    ws.onopen = function() {
        console.log("Connected to server");
    };
    
    ws.onclose = function() {
        console.log("Disconnected from server");
        //refresh the page unless the session has expired
        if(!expired) {
            location.reload();
        }
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
                
                expiration_time = content.expires;
                
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
                expiration_time = content.expires;
                return;
            }
            case OpCode.EMAIL_INCOMING: {
                //if the server sends an email, alert the user
                createEmailElement(content.data.from,
                    content.data.subject,
                    html_mode ? content.data.html || content.data.body : content.data.body,
                    content.data.date,
                    content.data.html
                );
            }
            
        }
    };
}, 300);

//copy the text from the email input to the clipboard
function copy() {
    const email = document.getElementById("email");
    email.select();
    email.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(email.value).then(r => {
        //change the `copy_button` text to a checkmark for 3 seconds
        const copy_button = document.getElementById("copy_button");
        copy_button.innerHTML = "✓ Copied!";
        setTimeout(function() {
            copy_button.innerHTML = "Copy";
        }, 3000);
    }).catch(() => {
        //if the copy fails, alert the user
        alert("Failed to copy email to clipboard.");
    });
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
    const x = document.getElementsByClassName("topnav")[0];
    x.className = x.className === "" ? "responsive" : "";
}

function formatDate(timestamp) {
    //format: "Day Name, Month Day, Year; Hour:Minute:Second"
    //ex "Tuesday, May 5, 2020 at 12:00:00"
    const date = new Date(timestamp);
    const date_name = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const month_name = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${date_name[date.getDay()]}, ${month_name[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

function createEmailElement(sender, subject, body, date, html) {
    const email = document.createElement("div");
    email.className = "email_entity";
    email.innerHTML = `<h2>From: ${sender}</h2><h2>Subject: ${subject}</h2><p id=${date}>Click to expand</p><div id="email_display"></div>`;
    //create a hidden div to hold the body of the email
    const email_display = document.createElement("div");
    email_display.className = "email_display";
    email_display.style.display = "none";
    email_display.innerHTML = `<h5>Date received: ${formatDate(date)}</h5>`;
    //<p>${(html_mode ? stripTags(html) : noHTML(body))}</p>
    //if html_mode, create an iframe with the html in it
    if(html_mode) {
        const iframe = document.createElement("iframe");
        iframe.srcdoc = html;
        iframe.style.width = "100%";
        iframe.style.height = "100vh";
        email_display.appendChild(iframe);
    } else {
        email_display.innerHTML += `<p>${noHTML(body)}</p>`;
    }
    email.onclick = () => {
        email_display.style.display = "block";
        document.getElementById(String(date)).style.display = "none";
    };
    email.appendChild(email_display);
    const hr = document.createElement("hr");
    email.appendChild(hr);
    document.getElementById("emails_container").prepend(email);
}

function toggleHTMLMode() {
    html_mode = document.getElementById("html_mode").checked;
}

setTimeout(() => {
    document.getElementById("html_mode").checked = html_mode;
}, 100);

setInterval(() => {
    //expiration_time is a unix timestamp
    //get the minutes until expiration
    
    const exp = Math.floor((expiration_time - Date.now()) / 60000);
    
    if(exp <= 0) {
        document.getElementById("expires_p").innerText = "Your inbox has expired.  To generate a new inbox, click the regenerate button.";
        expired = true;
    } else {
        document.getElementById("expires_container").innerText = String(exp);
    }
    
}, 1000);
