import { exprToHtml, exprToList, swapSubmitToLoading, swapLoadingBack } from './helpers.js';

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

    document.getElementById('user-name').textContent = profileData.name;
    document.getElementById('user-email').textContent = profileData.email;
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
    status.textContent = '';
}

function groupButtons(){
    const plusButton = document.createElement('button');
    plusButton.textContent = 'Add group';
    plusButton.id = 'add-group';
    plusButton.classList.add('inline');
        
    document.getElementById('experience').insertAdjacentElement('beforebegin', plusButton);

    let trashButton = document.createElement('button');
    trashButton.textContent = '🗑️';
    trashButton.id = 'delete-group';
    trashButton.classList.add('inline');

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
    exprToList(expr, 'delete-select', 'Group to delete');
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
        status.textContent = `Successfully deleted ${groupName} ${year}. Reloading...`;
        resetDeleter();
    }
    else{
        status.textContent = `Successfully added ${groupName} ${year}. Reloading...`;
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

async function addExprSubmitPressed(submitter){
    status.textContent = ``;
    swapSubmitToLoading(submitter);
    
    const group = document.getElementById('group-select').value;
    const year = document.getElementById('year-marched').value;
    await addExpr(group, year);
    swapLoadingBack(submitter);
}

document.getElementById('add-exp').addEventListener('submit', event => {
    event.preventDefault();
    addExprSubmitPressed(event.submitter);
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

async function removeExprSubmitPressed(submitter){
    status.textContent = ``;
    swapSubmitToLoading(submitter);
    
    const select = document.getElementById('delete-select');
    const selectedOption = select.options[select.selectedIndex];
    
    const group = selectedOption.value;
    const year = selectedOption.dataset.year;
    await deleteExpr(group, year);
    swapLoadingBack(submitter);
}

document.getElementById('delete-group-form').addEventListener('submit', event => {
    event.preventDefault();
    removeExprSubmitPressed(event.submitter);
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

async function validateClip(videoId, start, end){  
    const startStr = String(start);
    const endStr = String(end);  
    const response = await fetch(`/api/validate-clip?videoid=${videoId}&start=${startStr}&end=${endStr}`);
    if( !response.ok ){
        const errorData = await response.json();
        document.getElementById('clip-status').textContent = `Error: ${errorData.error}`;
    }
    return response.ok;
}

function timestampToSeconds(timestamp) {
    timestamp = timestamp.trim()
    if(timestamp.indexOf(':') === -1){
        return null;
    }
    let minute;
    let second;

    if(timestamp.indexOf(':') === 0){
        minute = 0;
    }
    else {
        minute = parseInt(timestamp.slice(0, timestamp.indexOf(':')));
    }

    if(timestamp.indexOf(':') === (timestamp.length - 1)){
        second = 0;
    }
    else {
        second = parseInt(timestamp.slice(timestamp.indexOf(':') + 1));
    }

    return minute * 60 + second;
}

async function addClipSubmitPressed(event){
    const clipStatus = document.getElementById('clip-status');
    clipStatus.textContent = ``;
    swapSubmitToLoading(event.submitter);
    
    const clipLink = document.getElementById('clip-link').value;
    const videoId = extractVideoId(clipLink);
    if(!videoId){
        clipStatus.textContent = 'Invalid Url';
        swapLoadingBack(event.submitter);
        return;
    }
    
    let startTime = document.getElementById('start-time').value;
    startTime = timestampToSeconds(startTime);
    let endTime = document.getElementById('end-time').value;
    endTime = timestampToSeconds(endTime);
    
    if(startTime === null || endTime === null){
        clipStatus.textContent = 'Invalid timestamp';
        swapLoadingBack(event.submitter);
        return;
    }
    
    const isValid = await validateClip(videoId, startTime, endTime)
    if (!isValid) {
        swapLoadingBack(event.submitter);
        return;
    }
    
    const groupCont = event.target.closest('.WGI-cont, .DCI-cont');
    const group = groupCont.querySelector('[data-group]').dataset.group;
    const year = groupCont.parentElement.parentElement.firstElementChild.dataset.year;
    await addClip(year, group, videoId, startTime, endTime);
    clipStatus.textContent = 'Successfully added clip. Reloading...';
    event.submitter.parentElement.remove();
}

document.getElementById('experience').addEventListener('submit', async event => {
    if (!event.target.matches('#add-clip')) return;
    event.preventDefault();
    addClipSubmitPressed(event);
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
    
    const clipDelStatus = document.createElement('p');
    clipDelStatus.id = 'clip-del-status';
    clipDelStatus.textContent = 'Deleting clip...';
    document.getElementById(activeContainerId).append(clipDelStatus);

    activeContainerId = null;
    activeButton = null;
    activeDelButton = null;

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
    // Reveal add group
    let button = event.target.closest('#add-group');
    if(button){
        resetDeleter();
        editor.hidden = false;
        return
    }

    // Reveal delete group
    button = event.target.closest('#delete-group');
    if(button){
        resetEditorForms();
        deleter.hidden = false;
        return
    }

    // Reveal add clip
    button = event.target.closest('.add-clip');
    if(button){
        if(activeClipCont){
            addSingleClipButton(document.getElementById('add-clip-cont').parentElement);
            document.getElementById('add-clip-cont').remove();
            activeClipCont = false;
        }

        button.insertAdjacentHTML('afterend', `
            <div id="add-clip-cont">
                <form id="add-clip">
                    <fieldset>
                        <button class="exit" id="exit-add-clip"></button>
                        <legend>Clip</legend>
                        <div class="clip-options">
                            <div class="clip-duo">
                                <label for="clip-link">Youtube link</label>
                                <input required id="clip-link" type="url">
                            </div>
                            <div class="clip-duo">
                                <label for="start-time">Start timestamp:</label>
                                <input required class="clip-time" id="start-time" class="work-sans" name="start-time" type="text" placeholder="1:23">
                            </div>
                            <div class="clip-duo">
                                <label for="end-time">End timestamp:</label>
                                <input required class="clip-time" id="end-time" name="end-time" type="text" placeholder="4:56">
                            </div>
                            <button id="clip-submit" type="submit">
                                <span class="submit-span">Submit</span>
                                <img class="loading clear invisible" src="img/loading.gif" alt="Loading">
                            </button>
                        </div>
                        <p id="clip-status"></p>
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
        addSingleClipButton(button.closest('#add-clip-cont').parentElement);
        button.closest('#add-clip-cont').remove();
        activeClipCont = false;
        return;
    }

    // Delete clip
    button = event.target.closest('#delete-clip');
    if(button){
        const videoId = activeButton.dataset.videoId;
        const startTime = parseInt(activeButton.dataset.start);
        const endTime = parseInt(activeButton.dataset.end);
        
        const groupCont = activeButton.closest('.WGI-cont, .DCI-cont');
        const group = groupCont.querySelector('[data-group]').dataset.group;
        const year = groupCont.parentElement.parentElement.firstElementChild.dataset.year;
        
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