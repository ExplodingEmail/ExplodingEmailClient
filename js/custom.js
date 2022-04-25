


function createEmailElement(sender, to, subject, body, date, html) {
    const email = document.createElement("div");
    email.className = "email_entity";
    email.innerHTML = `<h2>From: ${sender}</h2><h2>To: </h2><h2>Subject: ${subject}</h2><p id=${date}>Click to expand</p><div id="email_display"></div>`;
    //create a hidden div to hold the body of the email
    const email_display = document.createElement("div");
    email_display.className = "email_display";
    email_display.style.display = "none";
    email_display.innerHTML = `<h5>Date received: ${new Date(date).toISOString()}</h5>`;
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
