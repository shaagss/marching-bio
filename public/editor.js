import { exprToHtml } from './helpers.js';

const yearInput = document.getElementById('year-marched');
const expSubmit = document.getElementById('exp-submit');

let allGroups = [];
let groupSelect;
const classOptions = {
    DCI: ["World", "Open", "All-Age", "International"],
    WGI: ["World", "Open", "A"]
};
const status = document.querySelector('#status');

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
    const profileAnchorLink = `marching.bio/${profileData.code}`;
    profileAnchor.textContent = profileAnchorLink;
    profileAnchor.href = 'https://' + profileAnchorLink;

    document.querySelector('body').hidden = false;
    await loadGroups();
    await updatePreviewExpr();
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
    
    document.getElementById('editor').classList.remove('invisible');
}

// ---Updates preview from DB---
async function updatePreviewExpr(){
    const response = await fetch(`/api/expr`);
    if (!response.ok) {
        console.error('Failed to load profile:', response.status);
        return;
    }

    const expr = await response.json();
    exprToHtml(expr, 'preview-expr');
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

    // groupSelect.clear();
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
async function addExpr(group, year, key) {
    const response = await fetch('/api/expr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, year, key })
    });
    if( !response.ok ){
        status.textContent = `ERROR: Please try again`;
    }

    addStatusElements(group, year);
    updatePreviewExpr();
}

function addStatusElements(groupId, year){
    const groupName = document.querySelector(`option[value="${groupId}"`).textContent;
    status.textContent = `Successfully added ${groupName} ${year} to your experience`;
    
    groupSelect.clear();
    document.getElementById('year-marched').value = '';
}    

document.getElementById('add-exp').addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = `Loading...`;

    const group = document.getElementById('group-select').value;
    const year = document.getElementById('year-marched').value;
    const key = document.getElementById('key').value;
    addExpr(group, year, key);
});    

