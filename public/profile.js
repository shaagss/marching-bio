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
    const { name, expr, clips, details, photo_url } = await response.json();
    await exprToHtml(expr, clips, details, 'experience');
    
    document.querySelector('body').hidden = false;
    requestAnimationFrame(() => {
        document.getElementById('user-card').classList.remove('hidden');
        document.getElementById('expr-card').classList.remove('hidden');
    });
    if( photo_url ){ 
        const userPhoto = document.createElement('img');
        userPhoto.id = 'user-photo';
        userPhoto.alt = "User's profile picture";
        userPhoto.src = photo_url;

        document.getElementById('name').insertAdjacentElement('beforebegin', userPhoto);
    }
    if(name === null){
        document.title = name + 'user - marching.bio'
        profileName.textContent = "Invalid name";
    }
    else{
        document.title = name + ' - marching.bio'
        profileName.textContent = name;
    }
    
}

// ---Listen for clip button presses---
experience.addEventListener('click', async (event) => {
    const button = event.target.closest('.clip-toggle');
    if (!button) return; // click was on something else inside #experience, ignore it

    const containerId = button.getAttribute('aria-controls');
    const container = document.getElementById(containerId);
    const playerTargetId = `player-${containerId}`;

    // if this exact button's clip is already open, treat it as closing it
    const clickedActiveOne = (containerId === activeContainerId);

    if (activePlayer) {
        activePlayer.destroy();
        activePlayer = null;
        activeButton.textContent = '🎥 #' + activeButton.dataset.count;
        
        // animate closed
        const prevContainer = document.getElementById(activeContainerId);
        prevContainer.style.maxHeight = '0px';
        prevContainer.classList.remove('expanded');

        activeContainerId = null;
        activeButton = null;
    }

    if (clickedActiveOne) {
        return; // it was already open, so clicking it just closes it
    }

    button.textContent = 'Hide';
    await ensureYtApiLoaded();

    activeContainerId = containerId;
    activeButton = button;

    let playerTargetEl = document.getElementById(playerTargetId);
    if(!playerTargetEl){
        playerTargetEl = document.createElement('div');
        playerTargetEl.id = playerTargetId;
        container.appendChild(playerTargetEl);
    }

    activePlayer = await createClipPlayer(playerTargetId, {
        videoId: button.dataset.videoId,
        start: parseInt(button.dataset.start),
        end: parseInt(button.dataset.end)
    });
    activePlayer.playVideo();

    //expand player cont
    container.classList.add('expanded');

    container.style.maxHeight = 'none';
    const realHeight = container.scrollHeight;

    container.style.maxHeight = '0px';
    container.offsetHeight;

    container.style.maxHeight = realHeight + 'px';
});