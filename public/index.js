import { swapSubmitToLoading, swapLoadingBack } from './helpers.js';

const dialog = document.getElementById('login');
const makeBtn = document.getElementById('make-btn');
const formSwap = document.getElementById('form-swap');
const statusText = document.getElementById('status-text');
const loginForm = document.getElementById('login-form');

let existingUser = false;
let askForName = true;

checkAuthStatus();

// ---Existing user cookie checker---
function openLogin() {
    dialog.showModal();

    requestAnimationFrame(() => {
        dialog.classList.add('shown');
    });
}

function closeLogin() {
    dialog.classList.remove('shown');

    setTimeout(() => {
        dialog.close();
    }, 1000)
}

document.getElementById('login').addEventListener('click', (event) => {
    const button = event.target.closest('#exit-login');
    if (!button) return;
    closeLogin();
});

async function checkAuthStatus() {
    const response = await fetch('/api/me');
    const data = await response.json();
    existingUser = data.loggedIn;
    makeBtn.style.pointerEvents = 'auto';
}

makeBtn.addEventListener('click', () => {
    if (existingUser) {
        window.location.href = '/editor';
    } else {
        openLogin();
    }
});

// ---Swap login options---
formSwap.addEventListener('click', () => {
    const nameGroup = document.getElementById('name-duo');
    const nameInput = document.getElementById('name');
    
    if (askForName) {
        nameInput.required = false;
        nameGroup.style.display = 'none';

        formSwap.textContent = 'New marcher?';
    } else {
        nameInput.required = true;
        nameGroup.style.display = '';

        formSwap.textContent = 'Already joined?';
    }

    askForName = !askForName
});

// ---When user submits login form---
async function profileExists(email){
    const response = await fetch(`/api/existing-profile?email=${email}`);
    return !(await response.json() === null);
}

async function requestLogin(email, name) {
    statusText.textContent = '';
    
    // If it needs name but its empty - just in case
    if ( name.trim() === '' && askForName ) {
        statusText.textContent = 'Something went wrong. Try again.';
        statusText.style.color = 'red';
        return;
    }
    
    // If user turns off name, but their profile doesnt exist
    if( !askForName && !(await profileExists(email)) ){
        statusText.textContent = 'Account doesn\'t exist.';
        statusText.style.color = 'red';
        return;
    }
    
    if( !askForName ){
        name = null;
    }
    
    const response = await fetch('/api/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
    });
    
    if ( response.ok ) {
        statusText.textContent = 'Check your email!';
        statusText.style.color = 'black';
        loginForm.style.display = 'none';
    } else {
        statusText.textContent = 'Something went wrong. Try again.';
        statusText.style.color = 'red';
    }
}

async function submitPressed(submitter){
    swapSubmitToLoading(submitter);
    
    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;
    
    await requestLogin(email, name);
    swapLoadingBack(submitter);
}

loginForm.addEventListener('submit', event => {
    event.preventDefault();
    submitPressed(event.submitter);
});

