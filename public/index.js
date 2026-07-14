const dialog = document.getElementById('login');

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