import { exprToHtml, exprToList } from './helpers.js';

const yearInput = document.getElementById('year-marched');
const expSubmit = document.getElementById('exp-submit');
const editor = document.getElementById('editor');
const deleter = document.getElementById('deleter');
const status = document.getElementById('status')

let allGroups = [];
let activeClipCont = false;
let groupSelect;
const classOptions = {
    DCI: ["World", "Open", "All-Age", "International"],
    WGI: ["World", "Open", "A"]
};

let activePlayer = null;
let activeContainerId = null;
let activeButton = null;
let activeDelButton = null;

checkAuth();

// ---Checks cookie for access---
async function checkAuth() {
    const response = await fetch('/api/me');
    const data = await response.json();
    if (!data.loggedIn) {
        window.location.href = '/';
        return;
    }

    const profileRes = await fetch(`/api/existing-profile?email=${data.email}`);
    const profileData = await profileRes.json()

    document.getElementById('user-info').textContent = `${profileData.name} (${profileData.email})`;
    const profileAnchor = document.getElementById('profile-link');
    const profileAnchorLink = '/' + profileData.code;
    profileAnchor.textContent = 'marching.bio' + profileAnchorLink;
    profileAnchor.href = profileAnchorLink;

    document.querySelector('body').hidden = false;
    await loadGroups();
    await updatePreviewExpr();
    groupButtons();
}

// ---Sets up groups from DB---
async function loadGroups() {
    const response = await fetch('/api/get-groups');
    if (!response.ok) {
        console.error('Failed to load groups:', response.status);
        return;
    }

    allGroups = await response.json();
    initGroupSelect();
}

function initGroupSelect() {
    groupSelect = new TomSelect('#group-select', {
        valueField: 'id',
        labelField: 'name',
        searchField: 'name',
        options: [],
        placeholder: 'Select all options first',
    });
    groupSelect.disable();
    
    editor.classList.remove('invisible');
}

// ---Updates preview from DB---
async function updatePreviewExpr(){
    const exprRes = await fetch(`/api/expr`);
    if (!exprRes.ok) {
        console.error('Failed to load expr:', exprRes.status);
        return;
    }
    const expr = await exprRes.json();

    const clipsRes = await fetch(`/api/clips`);
    if (!clipsRes.ok) {
        console.error('Failed to load clips:', clipsRes.status);
        return;
    }
    const clips = await clipsRes.json();

    await exprToHtml(expr, clips, 'experience');
    updateDeleteGroup(expr);
    addClipButtons();
}

function groupButtons(){
    const plusButton = document.createElement('button');
    plusButton.textContent = 'Add group';
    plusButton.id = 'add-group';
        
    document.getElementById('experience').insertAdjacentElement('beforebegin', plusButton);

    let trashButton = document.createElement('button');
    trashButton.textContent = '🗑️';
    trashButton.id = 'delete-group';

    document.getElementById('experience').insertAdjacentElement('beforebegin', trashButton);
}

function addClipButtons() {
    // if it has a allClipButton-cont, add there.
    // if not, then just in the normal cont
    const allGroups = document.querySelectorAll('.WGI-cont, .DCI-cont');
    allGroups.forEach( element => {
        let apendee = element;
        if(element.querySelector('.allClipButton-cont')){
            apendee = element.querySelector('.allClipButton-cont');
        } 

        let button = document.createElement('button');
        button.textContent = '+🎥';
        button.classList.add('add-clip');
            
        apendee.appendChild(button);
    })
}

function delClipButton(){
    const button = document.createElement('button');
    button.textContent = '🗑️';
    button.id = 'delete-clip';

    // activeButton.insertAdjacentElement('afterend', button);
    activeButton.parentElement.parentElement.appendChild(button);
    activeDelButton = button;
}

function updateDeleteGroup(expr){
    exprToList(expr, 'delete-select', 'Select group to delete');
}

// ---Check what user submitted---
function getSelectedRadio(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
}

function updateGroupOptions() {
    const circuit = getSelectedRadio('circuit');
    const theClass = getSelectedRadio('class');
    const division = getSelectedRadio('division');

    groupSelect.clearOptions();

    // If either no circut or class selected, OR
    // The circuit is WGI and theres no division selected
    if ( (!circuit || !theClass) ||
        (circuit === 'WGI' && !division) ) {
        groupSelect.disable();
        groupSelect.settings.placeholder = 'Select all options first';
        groupSelect.control_input.placeholder = 'Select all options first';

        yearInput.disabled = true;
        expSubmit.disabled = true;
        return;
    }

    const filtered = allGroups.filter(g => g.circuit === circuit && g.class === theClass && g.division === division );
    groupSelect.addOptions(filtered);
    groupSelect.enable();
    groupSelect.settings.placeholder = 'Velvet Knights';
    groupSelect.control_input.placeholder = 'Velvet Knights';

    yearInput.disabled = false;
    expSubmit.disabled = false;
}

document.querySelectorAll('input[name="class"], input[name="division"]')
    .forEach(radio => {
        radio.addEventListener('change', updateGroupOptions)
    });

document.querySelectorAll('input[name="circuit"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const circuit = radio.value;
        
        // Clear all division, hide too if necessary
        const divisionSection = document.getElementById('division-section');
        document.querySelectorAll('input[name="division"]').forEach(radio => radio.checked = false);
        divisionSection.hidden = !(circuit === 'WGI');

        // Clear all class, only show valid options
        const classSection = document.getElementById('class-section');
        classSection.hidden = false;
        document.querySelectorAll('input[name="class"]').forEach(radio => {
            radio.checked = false;
            radio.parentElement.hidden = !(classOptions[circuit].includes(radio.value));
        });

        const selectorLabel = document.getElementById('select-label').textContent = (circuit === 'DCI') ? 'Corps' : 'Group';
        updateGroupOptions()
    });
});

// ---Adds expr to profile---
async function addExpr(group, year) {
    const response = await fetch('/api/expr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, year })
    });
    if( !response.ok ){
        status.textContent = `ERROR: Please try again`;
        return;
    }

    addStatusElements(group, year);
    updatePreviewExpr();
}

function addStatusElements(groupId, year, deleted = false){
    const groupName = document.querySelector(`option[value="${groupId}"]`).textContent;

    if(deleted){
        status.textContent = `Successfully deleted ${groupName} ${year} from your profile`;
        resetDeleter();
    }
    else{
        status.textContent = `Successfully added ${groupName} ${year} to your experience`;
        resetEditorForms();
    }
}    

function resetEditorForms(){
    document.getElementById('filter-groups').reset();

    const divisionSection = document.getElementById('division-section');
    document.querySelectorAll('input[name="division"]').forEach(radio => radio.checked = false);
    divisionSection.hidden = true;

    const classSection = document.getElementById('class-section');
    classSection.hidden = true;
    document.querySelectorAll('input[name="class"]').forEach(radio => {
        radio.checked = false;
        radio.parentElement.hidden = true;
    });

    groupSelect.clear();
    document.getElementById('year-marched').value = '';
    yearInput.disabled = true;
    groupSelect.disable();

    editor.hidden = true;
}


document.getElementById('add-exp').addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = `Loading...`;
    
    const group = document.getElementById('group-select').value;
    const year = document.getElementById('year-marched').value;
    addExpr(group, year);
});   

// ---Deletes expr from profile---
async function deleteExpr(group, year) {
    const response = await fetch('/api/expr', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, year })
    });
    if( !response.ok ){
        status.textContent = `ERROR: Please try again`;
        return;
    }

    addStatusElements(group, year, true);
    updatePreviewExpr();
}

function resetDeleter(){
    document.getElementById('delete-group-form').reset();
    document.getElementById('delete-select').value = '';
    deleter.hidden = true;
}

document.getElementById('delete-group-form').addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = `Loading...`;

    const select = document.getElementById('delete-select');
    const selectedOption = select.options[select.selectedIndex];

    const group = selectedOption.value;
    const year = selectedOption.dataset.year;
    deleteExpr(group, year);
});   

// ---Adds clip to profile---
async function addClip(year, group, videoId, startTime, endTime) {
    const response = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, group, videoId, startTime, endTime })
    });
    if( !response.ok ){
        document.getElementById('clip-status').textContent = `ERROR: Please try again`;
        return;
    }

    activeClipCont = false;

    updatePreviewExpr();
}

function extractVideoId(url){
    const possFormats = ['youtu.be/', 'youtube.com/shorts/', 'youtube.com/watch?v=']
    for(let baseUrl of possFormats){
        if(url.indexOf(baseUrl) != -1){
            const startIndex = url.indexOf(baseUrl) + baseUrl.length
            return url.slice(startIndex, startIndex + 11);
        }
    }
    return null;
}

async function validateClip(videoId, startTime, endTime){
    const response = await fetch('/api/validate-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, startTime, endTime })
    });
    if( !response.ok ){
        document.getElementById('clip-status').textContent = `ERROR: Invalid URL/ Timestamps`;
    }
    return response.ok;
}

function timestampToSeconds(timestamp) {
    timestamp = timestamp.trim()
    if(timestamp.indexOf(':') === -1){
        return null;
    }
    const minute = parseInt(timestamp.slice(0, timestamp.indexOf(':')));
    const second = parseInt(timestamp.slice(timestamp.indexOf(':') + 1));
    return minute * 60 + second;
}

document.getElementById('experience').addEventListener('submit', async event => {
    if (!event.target.matches('#add-clip')) return;
    event.preventDefault();
    document.getElementById('clip-status').textContent = `Loading...`;

    const clipLink = document.getElementById('clip-link').value;
    const videoId = extractVideoId(clipLink);
    if(!videoId){
        document.getElementById('clip-status').textContent = 'Invalid Url';
        return;
    }

    let startTime = document.getElementById('start-time').value;
    startTime = timestampToSeconds(startTime);
    let endTime = document.getElementById('end-time').value;
    endTime = timestampToSeconds(endTime);

    if(startTime === null || endTime === null){
        document.getElementById('clip-status').textContent = 'Invalid timestamp';
        return;
    }

    const isValid = await validateClip(videoId, startTime, endTime)
    if (!isValid) {
        return;
    }

    const groupCont = event.target.closest('.WGI-cont, .DCI-cont');
    const group = groupCont.firstElementChild.dataset.group;
    const year = groupCont.parentElement.parentElement.firstElementChild.dataset.year;
    addClip(year, group, videoId, startTime, endTime);
});

// ---Deletes clip from profile---
async function deleteClip(year, group, videoId, startTime, endTime) {
    const response = await fetch('/api/clips', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, group, videoId, startTime, endTime })
    });
    if (!response.ok) {
        status.textContent = `ERROR: Please try again`;
        return;
    }

    activePlayer?.destroy();
    activePlayer = null;
    activeContainerId = null;
    activeButton = null;
    activeDelButton = null;

    status.textContent = `Successfully deleted clip`;
    updatePreviewExpr();
}

// ---Toggles for expr and clips adder forms---

function addSingleClipButton(groupCont) {
        let newClipButton = document.createElement('button');
        newClipButton.textContent = '+🎥';
        newClipButton.classList.add('add-clip');
        groupCont.appendChild(newClipButton);
}

document.getElementById('expr-card').addEventListener('click', async (event) => {
    // Add group button
    let button = event.target.closest('#add-group');
    if(button){
        resetDeleter();
        editor.hidden = false;
        return
    }

    // Delete group button
    button = event.target.closest('#delete-group');
    if(button){
        resetEditorForms();
        deleter.hidden = false;
        return
    }

    // Add clip button
    button = event.target.closest('.add-clip');
    if(button){
        if(activeClipCont){
            addSingleClipButton(document.getElementById('add-clip-cont').parentElement);
            document.getElementById('add-clip-cont').remove();
            activeClipCont = false;
        }

        button.insertAdjacentHTML('afterend', `
            <div id="add-clip-cont">
                <button id="exit-add-clip">XX</button>
                <p id="clip-status"></p>
                <form id="add-clip">
                    <fieldset>
                        <legend>Clip</legend>
                        <div class="options">
                            <label for="clip-link">Youtube link</label><br>
                            <input required id="clip-link" type="url"></input><br><br>
                            <label for="start-time">Start timestamp:</label>
                            <input required id="start-time" class="work-sans" name="start-time" type="text" placeholder="1:23"><br><br>
                            <label for="end-time">End timestamp:</label>
                            <input required id="end-time" name="end-time" type="text" placeholder="4:56"><br><br>
                            <input id="clip-submit" type="submit" value="Submit">
                        </div>
                    </fieldset>
                </form>
            </div>
            `);
        button.remove();
        activeClipCont = true;
        return;
    }

    // Exit add clip
    button = event.target.closest('#exit-add-clip');
    if(button){
        addSingleClipButton(button.parentElement.parentElement);

        button.parentElement.remove();
        activeClipCont = false;
        return;
    }

    // Delete clip
    button = event.target.closest('#delete-clip');
    if(button){
        const videoId = activeButton.dataset.videoId;
        const startTime = parseInt(activeButton.dataset.start);
        const endTime = parseInt(activeButton.dataset.end);

        const groupsCont = activeButton.closest('.WGI-cont, .DCI-cont');
        const group = groupsCont.firstElementChild.dataset.group;
        const year = groupsCont.parentElement.parentElement.firstElementChild.dataset.year;

        deleteClip(year, group, videoId, startTime, endTime);
        return;
    }

    return;
});

// Exit add group
document.getElementById('exit-add-group').addEventListener('click', (event) => {
    resetEditorForms();
});

//Exit delete group
document.getElementById('exit-delete-group').addEventListener('click', (event) => {
    resetDeleter();
});


// ---Listen for clip button presses---
document.getElementById('experience').addEventListener('click', async (event) => {
    const button = event.target.closest('.clip-toggle');
    if (!button) return; 

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
        activeDelButton.remove();
    }

    if (clickedActiveOne) {
        return; // it was already open, so clicking it just closes it
    }

    button.textContent = 'Hide';
    await ensureYtApiLoaded();
    
    activeContainerId = containerId;
    activeButton = button;
    delClipButton();

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