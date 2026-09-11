import { exprToHtml, exprToGroupInfo } from './helpers.js';

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
    const groupDetails = await exprToGroupInfo(expr);
    await exprToHtml(expr, clips, details, 'experience', groupDetails);
    
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
        
        const userPhotoCont = document.createElement('div');
        userPhotoCont.id = 'user-photo-cont';

        document.getElementById('name').insertAdjacentElement('beforebegin', userPhotoCont);
        userPhotoCont.appendChild(userPhoto);
    }

    if(name === null){
        document.title = name + 'user - marching.bio'
        profileName.textContent = "Invalid name";
    }
    else{
        document.title = name + ' - marching.bio'
        profileName.textContent = name;
    }

    if(Object.hasOwn(details, 'instruments')){
        let instContId;
        if(photo_url){
            instContId = 'user-photo-cont';
        }
        else {
            const userInstCont = document.createElement('div');
            userInstCont.id = 'user-inst-cont';
            document.getElementById('name').insertAdjacentElement('beforebegin', userInstCont);
            instContId = 'user-inst-cont';
        }

        instrumentsToPhotos(details.instruments, document.getElementById(instContId), (photo_url !== null));
    }
    
}

function instrumentsToPhotos(inst, parent, hasPhoto){
    if(inst.length > 0 === false) return; // must have atleast 1

    const imgOne = makeInstPhoto(inst[0], hasPhoto);
    if(hasPhoto){
        imgOne.id = 'user-inst-one';
    }
    parent.appendChild(imgOne);

    if(inst.length > 1 === false) return; //have two

    const imgTwo = makeInstPhoto(inst[1], hasPhoto);
    if(hasPhoto){
        imgTwo.id = 'user-inst-two';
    }
    parent.appendChild(imgTwo);

    if(inst.length > 2 === false) return; //have three

    const imgThree = makeInstPhoto(inst[2], hasPhoto);
    if(hasPhoto){
        imgThree.id = 'user-inst-three';
    }
    parent.appendChild(imgThree);

    if(inst.length > 3 === false) return; //have four

    const imgFour = makeInstPhoto(inst[3], hasPhoto);
    if(hasPhoto){
        imgFour.id = 'user-inst-four';
    }
    parent.appendChild(imgFour);
}

function makeInstPhoto(inst, hasPhoto){
    let fileName;
    if(inst === 'Drum Major'){
        fileName = 'drum-major';
    }
    else if(inst === 'Met Runner'){
        fileName = 'met-runner';
    }
    else if(inst === 'French horn'){
        fileName = 'french-horn';
    }
    else {
        fileName = inst.toLowerCase();
    }

    const instImg = document.createElement('img');
    instImg.src = `img/instruments/${fileName}.png`;
    instImg.alt = inst;
    if(hasPhoto){
        instImg.classList.add('user-inst', 'inst-hasPhoto');
    }
    else {
        instImg.classList.add('user-inst', 'inst-noPhoto');
    }

    return instImg;
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