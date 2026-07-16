const dialog = document.getElementById('login');
document.getElementById('make-btn').style.pointerEvents = 'none';

let isLoggedIn = false;
let existing = false;

async function checkAuthStatus() {
    const response = await fetch('/api/me');
    const data = await response.json();
    isLoggedIn = data.loggedIn;
    document.getElementById('make-btn').style.pointerEvents = 'auto';
}

document.getElementById('make-btn').addEventListener('click', () => {
    if (isLoggedIn) {
        window.location.href = '/editor';
    } else {
        openLogin();
    }
});

document.getElementById('form-swap').addEventListener('click', () => {
    const nameGroup = document.getElementById('name-duo');
    const nameInput = document.getElementById('name');

    if (existing === false) {
        nameInput.required = false;
        nameGroup.style.display = 'none';

        document.getElementById('form-swap').textContent = 'New marcher?';
        existing = true;
    } else {
        nameInput.required = true;
        nameGroup.style.display = '';

        document.getElementById('form-swap').textContent = 'Already joined?';
        existing = false;
    }
});

checkAuthStatus();

function openLogin() {
    dialog.showModal();
}

function closeLogin() {
    dialog.close();
}

async function profileExists(email){
    const response = await fetch(`/api/existing-profile`);
    if(await response.json() === null){
        return false;
    }
    else {
        return true;
    }
    
}

document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;
    const key = document.getElementById('key').value;
    
    document.getElementById('check').textContent = '';
    requestLogin(email, name, key);
});

async function requestLogin(email, name, key) {
    if (name.trim() === '' && existing === false) {
        document.getElementById('check').textContent = 'Something went wrong. Try again.';
        document.getElementById('check').style.color = 'red';
        return;
    }
    if(existing===true && await profileExists(email) === false){
        document.getElementById('check').textContent = 'Account doesn\'t exist.';
        document.getElementById('check').style.color = 'red';
        return;
    }

    if(existing === true){
        name = null;
    }

    const response = await fetch('/api/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, key })
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