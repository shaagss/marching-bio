const dialog = document.getElementById('login');
document.getElementById('make-btn').style.pointerEvents = 'none';

let isLoggedIn = false;

async function checkAuthStatus() {
    const response = await fetch('/api/me');
    const data = await response.json();
    isLoggedIn = data.loggedIn;
    document.getElementById('make-btn').style.pointerEvents = 'auto';
}

document.getElementById('make-btn').addEventListener('click', () => {
    if (isLoggedIn) {
        window.location.href = '/edit-bio.html';
    } else {
        openLogin();
    }
});

checkAuthStatus();

function openLogin() {
    dialog.showModal();
}

function closeLogin() {
    dialog.close();
}

document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const key = document.getElementById('key').value;
    requestLogin(email, key);
});

async function requestLogin(email, key) {
    const response = await fetch('/api/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, key })
    });

    if (response.ok) {
        document.getElementById('check').textContent = 'Check your email!';
        document.getElementById('check').style.color = 'black';
        document.getElementById('login-form').style.display = 'none';
    } else {
        document.getElementById('check').textContent = 'Something went wrong. Try again.';
        document.getElementById('check').style.color = 'red';
    }
}