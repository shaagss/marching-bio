async function loadProfile() {
    const code = window.location.pathname.slice(1);

    const response = await fetch(`/api/profile?code=${code}`);

    if (!response.ok) {
        window.location.href = '/';
        return;
    }

    const profile = await response.json();

    
    if(profile.name === null){
        document.getElementById('name').textContent = "Valid profile, no name";
    }
    else{
        document.getElementById('name').textContent = profile.name;
    }
    
}

loadProfile();