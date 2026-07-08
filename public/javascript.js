console.log("JavaScript file is successfully connected!");

async function special() {
    const {requestLogin} = await import('../api/request-login.mjs');

    requestLogin('shags6669@gmail.com');
}

const dialog = document.getElementById('login');

function openLogin() {
    dialog.showModal();
}

function closeLogin() {
    dialog.close();
}

