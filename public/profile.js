import { exprToHtml } from './helpers.js';

const profileName = document.getElementById('name');
const experience = document.getElementById('experience');

let activePlayer = null;
let activeContainerId = null;
let activeButton = null;

loadProfile();

// ---Get users profile---
async function loadProfile() {
    const code = window.location.pathname.slice(1);

    const response = await fetch(`/api/profile?code=${code}`);
    if (!response.ok) {
        window.location.href = '/404';
        return;
    }

    ensureYtApiLoaded();
    const { name, expr, clips } = await response.json();
    exprToHtml(expr, clips, 'experience');
    
    document.querySelector('body').hidden = false;
    
    if(name === null){
        document.title = name + 'user - marching.bio'
        profileName.textContent = "Invalid name";
    }
    else{
        document.title = name + ' - marching.bio'
        profileName.textContent = name;
    }
    
}

experience.addEventListener('click', async (event) => {
    const button = event.target.closest('.clip-toggle');
    if (!button) return; // click was on something else inside #experience, ignore it

    const containerId = button.getAttribute('aria-controls');
    // if this exact button's clip is already open, treat it as closing it
    const clickedActiveOne = (containerId === activeContainerId);

    if (activePlayer) {
        activePlayer.destroy();
        activePlayer = null;
        activeButton.textContent = 'Show clip';
        activeContainerId = null;
        activeButton = null;
    }

    if (clickedActiveOne) {
        return; // it was already open, so clicking it just closes it
    }

    button.textContent = 'Hide clip';
    await ensureYtApiLoaded();

    activePlayer = await createClipPlayer(containerId, {
        videoId: button.dataset.videoId,
        start: parseInt(button.dataset.start),
        end: parseInt(button.dataset.end)
    });
    activePlayer.playVideo();
    console.log('done');
    activeContainerId = containerId;
    activeButton = button;
});