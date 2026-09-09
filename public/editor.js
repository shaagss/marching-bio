import { exprToHtml, exprToList, swapSubmitToLoading, swapLoadingBack } from './helpers.js';

const yearInput = document.getElementById('year-marched');
const expSubmit = document.getElementById('exp-submit');
const editor = document.getElementById('editor');
const deleter = document.getElementById('deleter');
const status = document.getElementById('status')

let allGroups = [];
let activeClipReveal = false;
let activeDetailReveal = false;
let groupSelect;
const classOptions = {
    DCI: ["World", "Open", "All-Age"],
    WGI: ["World", "Open", "A"]
};
let currentDetails;

let activePlayer = null;
let activeContainerId = null;
let activeButton = null;
let activeDelButton = null;

checkAuth();

// ---Checks cookie for access---
async function checkAuth() {
    
    try{
        const response = await fetch('/api/me');
        const data = await response.json();
        if (!data.loggedIn) {
            window.location.href = '/';
            return;
        }
    
        const profileRes = await fetch(`/api/existing-profile?email=${data.email}`);
        const profileData = await profileRes.json()

        if( profileData.photo_url ){
            const userPhoto = document.createElement('img');
            userPhoto.id = 'user-photo';
            userPhoto.alt = "User's profile picture";
            userPhoto.src = profileData.photo_url;

            const userRight = document.createElement('div');
            userRight.classList.add('user-right');
            userRight.appendChild(userPhoto);

            document.getElementById('flexer').appendChild(userRight);
        }

        currentDetails = profileData.details;
        if( Object.hasOwn(profileData.details, 'instruments') ){
            const addInstrumentButton = document.getElementById('add-instrument');
            for(const instrument of profileData.details.instruments){
                const instrumentP = document.createElement('p');
                instrumentP.classList.add('instrument', 'italic');
                instrumentP.textContent = instrument;
                addInstrumentButton.insertAdjacentElement('beforebegin', instrumentP);
            }
        }

        document.getElementById('user-name').textContent = profileData.name;
        document.getElementById('user-email').textContent = profileData.email;
        const profileAnchor = document.getElementById('profile-link');
        const profileAnchorLink = '/' + profileData.code;
        profileAnchor.textContent = 'marching.bio' + profileAnchorLink;
        profileAnchor.href = profileAnchorLink;

        document.querySelector('body').hidden = false;
        makeAddInstrument(profileData.details);
        await loadGroups();
        await updatePreviewExpr();
        groupButtons();
    }
    catch(err){
        console.error(err);
        document.querySelector('body').hidden = false;
        status.textContent = 'Network error, please try again. ' + err.message;
    }
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

// ---Profile photo---
function cropToSquare(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const size = Math.min(img.width, img.height);
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');
            const offsetX = (img.width - size) / 2;
            const offsetY = (img.height - size) / 2;
            ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);

            canvas.toBlob(resolve, 'image/jpeg', 0.85);
        };
        img.src = URL.createObjectURL(file);
    });
}

document.getElementById('photo-upload-btn').addEventListener('click', () => {
    document.getElementById('photo-input').click();
});

document.getElementById('photo-input').addEventListener('change', async () => {
    const file = document.getElementById('photo-input').files[0];
    if (!file) return;

    document.getElementById('photo-upload-btn').textContent = 'Uploading...';

    const croppedBlob = await cropToSquare(file);

    const response = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: croppedBlob,
    });

    if (!response.ok) {
        document.getElementById('photo-upload-btn').textContent = 'Error: try again';
        return;
    }

    document.getElementById('photo-upload-btn').textContent = 'Photo updated!';
});


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

    const detailsRes = await fetch(`/api/details`);
    if (!detailsRes.ok) {
        console.error('Failed to load details:', detailsRes.status);
        return;
    }
    const details = await detailsRes.json();

    await exprToHtml(expr, clips, details, 'experience');
    updateDeleteGroup(expr);
    addAddClipButton();
    addEditDetailsButton();
    status.textContent = '';
    closeAllReveals();
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

function addAddClipButton() {
    // if it has a allClipButton-cont, add there.
    // if not, then just in the normal cont
    const allGroups = document.querySelectorAll('.WGI-cont, .DCI-cont');
    allGroups.forEach( element => {
        let button = document.createElement('button');
        button.textContent = '+🎥';
        button.classList.add('add-clip');

        if(element.querySelector('.allClipButton-cont')){
            element.querySelector('.allClipButton-cont').appendChild(button);
        } 
        else{
            element.querySelector('.name-cont').after(button);
        }  
    })
}

function delClipButton(){
    const button = document.createElement('button');
    button.textContent = '🗑️';
    button.id = 'delete-clip';

    // activeButton.insertAdjacentElement('afterend', button);
    // activeButton.parentElement.parentElement.appendChild(button);
    activeButton.closest('.allClips-cont').insertAdjacentElement('beforeend', button);
    activeDelButton = button;
}

function updateDeleteGroup(expr){
    exprToList(expr, 'delete-select', 'Group to delete');
}

// ---Instrument--
function makeAddInstrument(deets){
    const allInstrumentOptions = {
        'Brass': ['Trumpet', 'Mello', 'Bari', 'Sousa', 'Trombone', 'French horn'],
        'Drumline': ['Snare', 'Quads', 'Bass', 'Cymbals'],
        'Front Ensemble': ['Marimba', 'Vibes', 'XyloGlock', 'Synth', 'Drumset', 'Timpani', 'Guitar', 'Rack'],
        'Guard+VE': ['Flag', 'Weapons', 'Dancer', 'VE'],
        'Hands': ['Drum Major', 'Conductor', 'Met Runner'],
        'Woodwinds': ['Flute', 'Clarinet', 'Saxophone', 'Oboe', 'Bassoon']
    };

    let prevSelInst = [];
    if(Object.hasOwn(deets, 'instruments')){
        for(let inst of deets.instruments){
            prevSelInst.push(inst);
        }
    }
    
    const button = document.querySelector('#add-instrument').insertAdjacentHTML('afterend', `
        <div id="add-instrument-cont" hidden>
            <button class="exit" id="exit-add-instrument"></button>
            <form id="add-instrument-form">
                <fieldset>
                    <legend>What have you marched?</legend>
                    <div id="all-instrument-options">
                    </div>
                    <div class="inst-trio">
                        <p id="inst-currently-selected"></p>
                        <button id="submit-add-instrument" type="submit">
                            <span class="submit-span">Submit</span>
                            <img class="loading clear invisible" src="img/loading.gif" alt="Loading">
                        </button>
                        <p id="instrument-status"></p>
                    </div>
                </fieldset>
            </form>
        </div>
    `);

    let instCurrentSel = [];
    let numInstCurrentSel = 0;
    const pOfSelected = document.getElementById('inst-currently-selected');
    
    const allInstCont = document.getElementById('all-instrument-options');
    const instSectCont = document.createElement('form');
    instSectCont.classList.add('inst-category-head');
    instSectCont.id = 'inst-category-head';
    allInstCont.append(instSectCont);
    for(let [sect, instList] of Object.entries(allInstrumentOptions)){
        const sectDuo = document.createElement('div');
        sectDuo.classList.add('inst-category-duo');
        const sectHead = document.createElement('label');
        const sectInput = document.createElement('input');
        sectInput.type = 'radio';
        if(sect === 'Brass'){
            sectInput.checked = true;
        }
        sectInput.name = 'inst-category'
        sectInput.value = `${sect}-inst-cont`;
        sectInput.id = 'inst-category-' + sect;
        sectHead.htmlFor = 'inst-category-' + sect;
        sectHead.classList.add('inst-category-label');
        sectHead.textContent = sect;
        sectDuo.append(sectInput, sectHead);
        instSectCont.append(sectDuo);
        
        const indivInstCont = document.createElement('form');
        indivInstCont.classList.add('inst-cont');
        if(sect !== 'Brass'){
            indivInstCont.hidden = true;
        }
        indivInstCont.id = `${sect}-inst-cont`;
        allInstCont.append(indivInstCont);

        for(let inst of instList){
            const instDuo = document.createElement('div');
            instDuo.classList.add('inst-opt-duo');
            const label = document.createElement('label');
            const input = document.createElement('input');

            input.type = 'checkbox';
            input.name = 'user-instrument';
            input.value = inst;
            input.id = 'inst-' + inst;

            if(prevSelInst.includes(inst)){
                input.checked = true;
                numInstCurrentSel++;
                instCurrentSel.push(inst);
            }

            label.htmlFor = 'inst-' + inst;
            label.classList.add('inst-label');
            label.textContent = inst;
            instDuo.append(input, label);
            indivInstCont.append(instDuo);
        }

    }   
    
    document.getElementById('inst-category-head').addEventListener('change', event => {
        for(let cont of document.querySelectorAll('.inst-cont')){
            if(event.target.value !== cont.id){
                cont.hidden = true;
            }
            else {
                cont.hidden = false;
            }
        }
    });

    for(let inst of instCurrentSel){
        pOfSelected.textContent += inst + ' ';
    }
    if(numInstCurrentSel === 4){
        disableAllCheckboxes(allInstCont);
        pOfSelected.textContent += '(max 4)';
    }

    allInstCont.addEventListener('change', event => {
        if(event.target.name !== 'user-instrument') return;
        
        if(event.target.checked){
            instCurrentSel.push(event.target.value);
            numInstCurrentSel++;
        }
        else {
            const tempIndex = instCurrentSel.indexOf(event.target.value);
            instCurrentSel.splice(tempIndex, 1);
            if(numInstCurrentSel === 4){
                enableAllCheckboxes(allInstCont);
            }
            numInstCurrentSel--;
        }

        pOfSelected.textContent = '';
        for(let inst of instCurrentSel){
            pOfSelected.textContent += inst + ' ';
        }

        if(numInstCurrentSel === 4){
            disableAllCheckboxes(allInstCont);
            pOfSelected.textContent += '(max 4)';
        }
    })
}

function disableAllCheckboxes(allInstCont){
    const allChecks = allInstCont.querySelectorAll('[type="checkbox"]:not(:checked)');
    for(let unchecked of allChecks){
        unchecked.disabled = true;
    }
}

function enableAllCheckboxes(allInstCont){
    const allDisabled = allInstCont.querySelectorAll('[type="checkbox"]:disabled');
    for(let thisDisabled of allDisabled){
        thisDisabled.disabled = false;
    }
}

function openAddInstrument(button){
    button.hidden = true;
    const activeInst = document.querySelectorAll('.instrument');
    for(let thisActiveInst of activeInst){
        thisActiveInst.hidden = true;
    }
    document.querySelector('#add-instrument-cont').hidden = false;
}

function exitAddInstrument(exitButton){
    document.querySelector('#add-instrument-cont').hidden = true;
    document.querySelector('#add-instrument').hidden = false;
    const activeInst = document.querySelectorAll('.instrument');
    for(let thisActiveInst of activeInst){
        thisActiveInst.hidden = false;
    }
}

async function submitAddInstrument(button){
    swapSubmitToLoading(button);
    const allInstCont = document.getElementById('all-instrument-options');
    const instCurrentChecked = allInstCont.querySelectorAll('[type="checkbox"]:checked');
    if(instCurrentChecked.length === 0){
        delete currentDetails.instruments;
        await addInstDetails([]);
        swapLoadingBack(button);
        return;
    }
    let instVals = [];
    for(let thisCurrentChecked of instCurrentChecked){
        instVals.push(thisCurrentChecked.value);
    }
    currentDetails.instruments = instVals;
    await addInstDetails(currentDetails.instruments);
    swapLoadingBack(button);
}

document.getElementById('user-card').addEventListener('click', async (event) => {
    // Reveal add instrument
    let button = event.target.closest('#add-instrument');
    if(button){
        openAddInstrument(button);
        return;
    }

    // Exit add instrument
    button = event.target.closest('#exit-add-instrument');
    if(button){
        exitAddInstrument(button);
        return;
    }

    button = event.target.closest('#submit-add-instrument');
    if(button){
        event.preventDefault();
        submitAddInstrument(button);
        return;
    }
})


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
    await updatePreviewExpr();
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
    
    try{
        const group = document.getElementById('group-select').value;
        const year = document.getElementById('year-marched').value;
        await addExpr(group, year);
    }
    catch (err){
        console.error(err);
        status.textContent = 'Network error, please try again. ' + err.message;
    }
    finally{
        swapLoadingBack(submitter);
    }
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
    
    try{
        const select = document.getElementById('delete-select');
        const selectedOption = select.options[select.selectedIndex];
        
        const group = selectedOption.value;
        const year = selectedOption.dataset.year;
        await deleteExpr(group, year);
    }
    catch (err){
        console.error(err);
        status.textContent = 'Network error, please try again. ' + err.message;
    }
    finally {
        swapLoadingBack(submitter);
    }

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

    activeClipReveal = false;

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
    
    try {
        const clipLink = document.getElementById('clip-link').value;
        const videoId = extractVideoId(clipLink);
        if(!videoId){
            clipStatus.textContent = 'Invalid Url';
            clipStatus.style.color = 'red';
            return;
        }
        
        let startTime = document.getElementById('start-time').value;
        startTime = timestampToSeconds(startTime);
        let endTime = document.getElementById('end-time').value;
        endTime = timestampToSeconds(endTime);
        
        if(startTime === null || endTime === null){
            clipStatus.textContent = 'Invalid timestamp';
            clipStatus.style.color = 'red';
            return;
        }
        
        const isValid = await validateClip(videoId, startTime, endTime)
        if (!isValid) {
            return;
        }
        
        const groupCont = event.target.closest('.WGI-cont, .DCI-cont');
        const group = groupCont.querySelector('[data-group]').dataset.group;
        const year = groupCont.parentElement.parentElement.firstElementChild.dataset.year;
        await addClip(year, group, videoId, startTime, endTime);
        clipStatus.textContent = 'Successfully added clip. Reloading...';
        clipStatus.style.color = 'black';
        event.submitter.parentElement.remove();
    }
    catch (err){
        console.error(err);
        clipStatus.textContent = 'Network error, please try again. ' + err.message;
    }
    finally{
        swapLoadingBack(event.submitter);
    }
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

// --Details---
function addEditDetailsButton(){
    const allGroups = document.querySelectorAll('.WGI-cont, .DCI-cont');
    allGroups.forEach( element => {
        let apendee = element.querySelector('.name-cont');
        if(element.querySelector('.group-img-cont')){
            apendee = element.querySelector('.group-img-cont');
        } 
        
        let editDetailsButton = document.createElement('button');
        editDetailsButton.classList.add('edit-details');
        editDetailsButton.textContent = '✏️';
            
        apendee.appendChild(editDetailsButton);
    })
}

async function addDetails(year, circuit, details){
    const detailStatus = document.getElementById('detail-status');

    const response = await fetch('/api/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, circuit, details })
    });
    if( !response.ok ){
        detailStatus.style.color = "red";
        detailStatus.textContent = `ERROR: Please try again`;
        return;
    }
    detailStatus.style.color = "black";
    detailStatus.textContent = 'Reload to apply details';
}

async function addInstDetails(instDetails){
    const instStatus = document.getElementById('instrument-status');

    const response = await fetch('/api/instrument-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instDetails })
    });
    if( !response.ok ){
        instStatus.style.color = "red";
        instStatus.textContent = `ERROR: Please try again`;
        return;
    }
    instStatus.style.color = "black";
    instStatus.textContent = 'Reload to apply instruments';
}

function resetCompetitionDetailOptions(){
    const competitionDetailForm = document.getElementById('competition-detail-form');
    competitionDetailForm.replaceChildren();
    const year = competitionDetailForm.closest('.year-cont').querySelector('[data-year]').dataset.year;
    const circuit = competitionDetailForm.closest('.DCI-cont, .WGI-cont').querySelector('[data-circuit]').dataset.circuit;
    const division = competitionDetailForm.closest('.DCI-cont, .WGI-cont').querySelector('[data-division]').dataset.division;

    let theClass;
    if(Object.hasOwn(currentDetails, year) &&
        Object.hasOwn(currentDetails[year], circuit) &&
        Object.hasOwn(currentDetails[year][circuit], 'correctedClass'))
    {
        theClass = currentDetails[year][circuit]['correctedClass'];
    }
    else{
        theClass = competitionDetailForm.closest('.DCI-cont, .WGI-cont').querySelector('[data-class]').dataset.class;
    }

    const legend = document.createElement('legend')
    legend.textContent = 'Competition:';
    competitionDetailForm.appendChild(legend);

    const competitions = ['Finals', 'Semis', 'Prelims'];

    for(const competition of competitions){
        if(competition === 'Semis'){
            if(division === 'winds' || theClass === 'A' ||
                (circuit === 'DCI' && theClass !== 'World'))
            {
                continue;
            }
        }
        
        const detailDuo = document.createElement('div');
        detailDuo.classList.add('detail-duo');
        competitionDetailForm.appendChild(detailDuo);

        const detailInput = document.createElement('input');
        detailInput.type = 'radio';
        detailInput.id = competition;
        detailInput.name = 'competition';
        detailInput.value = competition;
        detailInput.required = true;
        if(competition === 'Finals'){
            detailInput.checked = true;
        }
        detailDuo.appendChild(detailInput);

        const detailLabel = document.createElement('label');
        detailLabel.htmlFor = competition;
        if(circuit === 'DCI'){
            detailLabel.textContent = `DCI ${theClass} ${competition}`;
        }
        else if(circuit === 'WGI'){
            detailLabel.textContent = `WGI ${competition}`;
        }
        detailDuo.appendChild(detailLabel);
        
    }

}

async function revertDetailsShowName(year, circuit){
    try{
        if(Object.hasOwn(currentDetails, year) &&
            Object.hasOwn(currentDetails[year], circuit) &&
            Object.hasOwn(currentDetails[year][circuit], 'showName'))
        {
            delete currentDetails[year][circuit]['showName'];
            addDetails(year, circuit, currentDetails[year][circuit])
        }
    }
    catch(err){
        console.error(err);
        status.textContent = 'Network error, please try again. ' + err.message;
    }
}

async function revertDetailsCompetitionTrio(year, circuit){
    try{
        if(Object.hasOwn(currentDetails, year) &&
            Object.hasOwn(currentDetails[year], circuit) &&
            Object.hasOwn(currentDetails[year][circuit], 'placement') &&
            Object.hasOwn(currentDetails[year][circuit], 'competition') &&
            Object.hasOwn(currentDetails[year][circuit], 'score'))
        {
            delete currentDetails[year][circuit]['placement'];
            delete currentDetails[year][circuit]['competition'];
            delete currentDetails[year][circuit]['score'];
            addDetails(year, circuit, currentDetails[year][circuit])
        }
    }
    catch(err){
        console.error(err);
        status.textContent = 'Network error, please try again. ' + err.message;
    }
}

async function revertDetailsCorrectedClass(year, circuit){
    try{
        if(Object.hasOwn(currentDetails, year) &&
            Object.hasOwn(currentDetails[year], circuit) &&
            Object.hasOwn(currentDetails[year][circuit], 'correctedClass'))
        {
            delete currentDetails[year][circuit]['correctedClass'];
            addDetails(year, circuit, currentDetails[year][circuit])
        }
    }
    catch(err){
        console.error(err);
        status.textContent = 'Network error, please try again. ' + err.message;
    }
}

async function addDetailsShowNameSubmitPressed(event, year, circuit){
    swapSubmitToLoading(event.submitter);
    
    try{
        currentDetails[year][circuit]['showName'] = event.target.elements.showName.value.trim();
        await addDetails(year, circuit, currentDetails[year][circuit]);
    }
    catch(err){
        console.error(err);
        status.textContent = 'Network error, please try again. ' + err.message;
    }
    finally {
        swapLoadingBack(event.submitter);
    }

}

async function addDetailsCompetitionTrioSubmitPressed(event, year, circuit){
    swapSubmitToLoading(event.submitter);
    
    try{
        currentDetails[year][circuit]['placement'] = event.target.elements.placement.value;
        currentDetails[year][circuit]['competition'] = event.target.elements.competition.value;
        if(event.target.elements.score.value.indexOf('.') === -1){
            event.target.elements.score.value += '.0';
        }
        currentDetails[year][circuit]['score'] = event.target.elements.score.value;
        await addDetails(year, circuit, currentDetails[year][circuit]);
    }
    catch(err){
        console.error(err);
        status.textContent = 'Network error, please try again. ' + err.message;
    }
    finally{
        swapLoadingBack(event.submitter);
    }

}

async function addDetailsCorrectedClassSubmitPressed(event, year, circuit){
    swapSubmitToLoading(event.submitter);

    try{
        if(event.target.elements['correctedClass'].value === event.target.closest('.DCI-cont, .WGI-cont').querySelector('[data-class]').dataset.class){
            if(Object.hasOwn(currentDetails[year][circuit], 'correctedClass')){
                delete currentDetails[year][circuit]['correctedClass'];
            }
        }
        else {
            currentDetails[year][circuit]['correctedClass'] = event.target.elements['correctedClass'].value;
        }
        await addDetails(year, circuit, currentDetails[year][circuit]);
    
        resetCompetitionDetailOptions();
    }
    catch(err){
        console.error(err);
        status.textContent = 'Network error, please try again. ' + err.message;
    }
    finally{
        swapLoadingBack(event.submitter);
    }
}

document.getElementById('experience').addEventListener('submit', async event => {
    if (!event.target.closest('#add-detail-cont')) return;
    event.preventDefault();

    const detailStatus = document.getElementById('detail-status');
    detailStatus.textContent = ``;

    const year = event.target.closest('.year-cont').querySelector('[data-year]').dataset.year;
    const circuit = event.target.closest('.WGI-cont, .DCI-cont').querySelector('[data-circuit]').dataset.circuit;

    if(!Object.hasOwn(currentDetails, year)){
        currentDetails[year] = {};
    }
    if(!Object.hasOwn(currentDetails[year], circuit)){
        currentDetails[year][circuit] = {};
    }

    if(event.target.matches('#add-detail-showName')){
        addDetailsShowNameSubmitPressed(event, year, circuit);
    }
    else if(event.target.matches('#add-detail-competitionTrio')){
        addDetailsCompetitionTrioSubmitPressed(event, year, circuit);
    }
    else if (event.target.matches('#add-detail-correctedClass')){
        addDetailsCorrectedClassSubmitPressed(event, year, circuit);
    }
})

// ---Toggles for expr, clips adder, and detail adder forms---
function addSingleClipButton(groupCont) {
    let newClipButton = document.createElement('button');
    newClipButton.textContent = '+🎥';
    newClipButton.classList.add('add-clip');

    if(groupCont.querySelector('.allClipButton-cont')){
        groupCont.querySelector('.allClipButton-cont').appendChild(newClipButton);
    } 
    else{
        groupCont.querySelector('.name-cont').after(newClipButton);
    }  
}

function addSingleDetailButton(groupCont){
    let apendee = groupCont.querySelector('.name-cont');
    if(groupCont.querySelector('.group-img-cont')){
        apendee = groupCont.querySelector('.group-img-cont');
    } 
    
    let editDetailsButton = document.createElement('button');
    editDetailsButton.classList.add('edit-details');
    editDetailsButton.textContent = '✏️';
        
    apendee.appendChild(editDetailsButton);
}

function closeAllReveals(){
    // Close clip adders
    if(activeClipReveal){
        activeClipReveal = false;
        const cont = document.getElementById('add-clip-cont');
        if(cont){
            addSingleClipButton(cont.closest('.WGI-cont, .DCI-cont'));
            cont.remove();
        }
    }

    if(activeDetailReveal){
        activeDetailReveal = false;
        const cont = document.getElementById('add-detail-cont');
        if(cont){
            addSingleDetailButton(document.getElementById('add-detail-cont').closest('.WGI-cont, .DCI-cont'));
            cont.remove();
        }
    }

    // Close playing clips
    if (activePlayer) {
        activePlayer.destroy();
        activePlayer = null;
        activeButton.textContent = '🎥 #' + activeButton.dataset.count;

        // animate closed  
        const prevContainer = document.getElementById(activeContainerId);
        if(prevContainer){
            prevContainer.style.maxHeight = '0px';
            prevContainer.classList.remove('expanded');
        }

        activeContainerId = null;
        activeButton = null;
        activeDelButton?.remove();
        activeDelButton = null;
    }

    // Close detail adders
}

document.getElementById('expr-card').addEventListener('click', async (event) => {
    // Reveal add group
    let button = event.target.closest('#add-group');
    if(button){
        resetDeleter();
        editor.hidden = false;
        return;
    }

    // Reveal delete group
    button = event.target.closest('#delete-group');
    if(button){
        resetEditorForms();
        deleter.hidden = false;
        return;
    }

    // Reveal add clip
    button = event.target.closest('.add-clip');
    if(button){
        closeAllReveals();

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
        activeClipReveal = true;
        return;
    }

    // Exit add clip
    button = event.target.closest('#exit-add-clip');
    if(button){
        addSingleClipButton(button.closest('.WGI-cont, .DCI-cont'));
        button.closest('#add-clip-cont').remove();
        activeClipReveal = false;
        return;
    }

    // Reveal add detail
    button = event.target.closest('.edit-details');
    if(button){
        closeAllReveals();

        const nameCont = button.closest('.WGI-cont, .DCI-cont').querySelector('.name-cont');
        
        nameCont.insertAdjacentHTML('afterend', `
            <div id="add-detail-cont">
                <button class="exit" id="exit-add-detail"></button>
                <div>
                    <p>Details</p>
                    <p id="detail-status"></p>
                </div>
                <form class="add-detail" id="add-detail-showName">
                    <fieldset>
                        <legend>Show Name</legend>
                        <div class="detail-options">
                            <div class="detail-duo">
                                <input required id="showName" type="text" placeholder="The Doors of Perception">
                            </div>
                            <button type="button" class="revert-detail" id="revert-showName">
                                <span class="">Reset</span>
                            </button>
                            <button id="showName-submit" type="submit">
                                <span class="submit-span">Apply</span>
                                <img class="loading clear invisible" src="img/loading.gif" alt="Loading">
                            </button>
                        </div>
                    </fieldset>
                </form>
                <form class="add-detail" id="add-detail-competitionTrio">
                    <fieldset>
                        <legend>Display Score</legend>
                        <div class="detail-options">
                            <div class="detail-duo">
                                <label for="placement">Placement:</label>
                                <input required id="placement" type="number" placeholder="3" min="1" max="99" inputmode="numeric">
                            </div>
                            <div class="detail-duo">
                                <label for="score">Score:</label>
                                <input required id="score" type="number" placeholder="97.038" min="0" max="100" step="0.001" inputmode="decimal">
                            </div>
                            <fieldset id="competition-detail-form">
                            </fieldset>
                            <button type="button" class="revert-detail" id="revert-competitionTrio">
                                <span class="">Reset</span>
                            </button>
                            <button id="competitionTrio-submit" type="submit">
                                <span class="submit-span">Apply</span>
                                <img class="loading clear invisible" src="img/loading.gif" alt="Loading">
                            </button>
                        </div>
                    </fieldset>
                </form>
                <form class="add-detail" id="add-detail-correctedClass">
                    <fieldset>
                        <legend>Corrected Class</legend>
                        <p>If the class this year is different than it is currently, use this form</p>
                        <div id="correctedClass-inputs"></div>
                        <div class="detail-options">
                            <button type="button" class="revert-detail" id="revert-correctedClass">
                                <span class="">Set Default</span>
                            </button>
                            <button id="correctedClass-submit" type="submit">
                                <span class="submit-span">Apply</span>
                                <img class="loading clear invisible" src="img/loading.gif" alt="Loading">
                            </button>
                        </div>
                    </fieldset>
                </form>
            </div>
        `);
        const correctedClassDetailOptions = nameCont.closest('.DCI-cont, .WGI-cont').querySelector('#correctedClass-inputs');
        let classList;
        if(nameCont.closest('.DCI-cont, .WGI-cont').querySelector('[data-circuit]').dataset.circuit === "DCI"){
            //DCI
            classList = ['All-Age', 'Open', 'World'];
        }
        else {
            //WGI
            classList = ['A', 'Open', 'World'];
        }
        for(const theClass of classList){
            const detailDuo = document.createElement('div');
            detailDuo.classList.add('detail-duo');
            correctedClassDetailOptions.insertAdjacentElement('afterbegin', detailDuo);

            const detailInput = document.createElement('input');
            detailInput.type = 'radio';
            detailInput.id = theClass;
            detailInput.name = 'correctedClass';
            detailInput.value = theClass;
            detailInput.required = true;
            detailDuo.appendChild(detailInput);

            const detailLabel = document.createElement('label');
            detailLabel.htmlFor = theClass;
            detailLabel.textContent = theClass;
            detailDuo.appendChild(detailLabel);
        }

        resetCompetitionDetailOptions();

        button.remove();

        activeDetailReveal = true;
    }

    // Exit add detail
    button = event.target.closest('#exit-add-detail');
    if(button){
        addSingleDetailButton(button.closest('.WGI-cont, .DCI-cont'));
        button.closest('#add-detail-cont').remove();
        activeDetailReveal = false;
        return;
    }

    // Revert detail
    button = event.target.closest('.revert-detail');
    if(button){
        const year = button.closest('.year-cont').querySelector('[data-year]').dataset.year;
        const circuit = button.closest('.DCI-cont, .WGI-cont').querySelector('[data-circuit]').dataset.circuit;

        if(button.id === 'revert-showName'){
            revertDetailsShowName(year, circuit);
        }
        else if(button.id === 'revert-competitionTrio'){
            revertDetailsCompetitionTrio(year, circuit);
        }
        else if(button.id === 'revert-correctedClass'){
            revertDetailsCorrectedClass(year, circuit);
        }
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

    closeAllReveals();

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