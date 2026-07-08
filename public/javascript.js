console.log("JavaScript file is successfully connected!");

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
    requestLogin(email);
});

async function requestLogin(email) {
  const response = await fetch('/api/request-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (response.ok) {
    document.getElementById('check').textContent = 'Check your email!';
    document.getElementById('login-form').style.display = 'none';
  } else {
    document.getElementById('check').textContent = 'Something went wrong. Try again.';
  }
}