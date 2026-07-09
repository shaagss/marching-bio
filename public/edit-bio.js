async function checkAuth() {
    const response = await fetch('/api/me');
    const data = await response.json();

    if (!data.loggedIn) {
        window.location.href = '/';
        return;
    }
    document.querySelector('h1').textContent = "You're in";
    document.getElementById('email').textContent = data.email;
    //use to load profile data
}

checkAuth();