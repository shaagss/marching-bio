import { exprToHtml } from './helpers.js';

async function loadProfile() {
    const code = window.location.pathname.slice(1);

    const response = await fetch(`/api/profile?code=${code}`);

    if (!response.ok) {
        window.location.href = '/404';
        return;
    }

    const profile = await response.json();
    exprToHtml(profile.expr, 'experience');
    document.querySelector('body').hidden = false;
    
    if(profile.name === null){
        document.title = profile.name + 'user - marching.bio'
        document.getElementById('name').textContent = "Valid profile, no name";
    }
    else{
        document.title = profile.name + ' - marching.bio'
        document.getElementById('name').textContent = profile.name;
    }
    
}

loadProfile();