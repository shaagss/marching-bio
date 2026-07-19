//---Checks cookie for access---
async function checkAuth() {
    const response = await fetch('/api/me');
    const data = await response.json();

    if (!data.loggedIn) {
        window.location.href = '/';
        return;
    }
    document.querySelector('h1').textContent = "You're in";
    document.getElementById('email').textContent = data.email;
    document.querySelector('body').hidden = false;
    await loadGroups();
    await updatePreviewExpr();
}

checkAuth();

//---Grabs all groups from DB---
let allGroups = [];
let groupSelect;

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

function getSelectedRadio(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
}

const yearInput = document.getElementById('year-marched');
const expSubmit = document.getElementById('exp-submit');

function updateGroupOptions() {
    const circuit = getSelectedRadio('circuit');
    const theClass = getSelectedRadio('class');
    const instrument = getSelectedRadio('instrument');

    // groupSelect.clear();
    groupSelect.clearOptions();

    if ( (!circuit || !theClass) ||
        (circuit === 'WGI' && !instrument) ) {
        groupSelect.disable();
        groupSelect.settings.placeholder = 'Select all options first';
        groupSelect.control_input.placeholder = 'Select all options first';
        yearInput.disabled = true;
        expSubmit.disabled = true;
        return;
    }

    const filtered = allGroups.filter(g => g.circuit === circuit && g.class === theClass && g.instrument === instrument );

    groupSelect.addOptions(filtered);
    groupSelect.enable();
    groupSelect.settings.placeholder = 'Velvet Knights';
    groupSelect.control_input.placeholder = 'Velvet Knights';
    yearInput.disabled = false;
    expSubmit.disabled = false;
}

document.querySelectorAll('input[name="class"], input[name="instrument"]')
    .forEach(radio => {
        radio.addEventListener('change', updateGroupOptions)
    });

const classOptions = {
    DCI: ["World", "Open", "All-Age", "International"],
    WGI: ["World", "Open", "A"]
};

document.querySelectorAll('input[name="circuit"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const circuit = radio.value;
        
        const instrumentSection = document.getElementById('instrument-section');
        document.querySelectorAll('input[name="instrument"]').forEach(radio => radio.checked = false);
        instrumentSection.hidden = !(circuit === 'WGI');

        const classSection = document.getElementById('class-section');
        classSection.hidden = false;
        document.querySelectorAll('input[name="class"]').forEach(radio => {
            radio.checked = false;
            radio.parentElement.hidden = !(classOptions[circuit].includes(radio.value));
        });

        const selectorLabel = document.getElementById('select-label').textContent = (circuit === 'DCI') ? 'Corps:' : 'Group:';

        updateGroupOptions()
    });
});

//---Adds to DB---
const conf = document.querySelector('#conf');

document.getElementById('add-exp').addEventListener('submit', function(event) {
    event.preventDefault();
    conf.textContent = `Loading...`;

    const group = document.getElementById('group-select').value;
    const year = document.getElementById('year-marched').value;
    const key = document.getElementById('key').value;

    addExpr(group, year, key);
});

function addStatusElements(groupId, year, success){
    if(success === true){
        const groupName = document.querySelector(`option[value="${groupId}"`).textContent;
        conf.textContent = `Successfully added ${groupName} ${year} to your experience`;
        groupSelect.clear();
        document.getElementById('year-marched').value = '';
    }
    else{
        conf.textContent = `ERROR: Please try again`;
    }
}

async function addExpr(group, year, key) {
    const response = await fetch('/api/expr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, year, key })
    });

    addStatusElements(group, year, response.ok);
    await updatePreviewExpr();
}

//Pulls DB to update expr preview on page

async function updatePreviewExpr(){
    const response = await fetch(`/api/expr`);

    if (!response.ok) {
        console.error('Failed to load profile:', response.status);
        return;
    }

    const expr = await response.json();
    exprToHtml(expr);
}

function exprToHtml(expr) {
    const preview = document.getElementById('preview-expr');
    preview.replaceChildren();

    for (const [key, value] of Object.entries(expr)){
        const yearCont = document.createElement('div')
        yearCont.classList.add('year-cont');

        const year = document.createElement('h3');
        year.textContent = key;
        yearCont.append(year);

        const circuits = ['WGI', 'DCI'];
        for(const circuit of circuits){
            if(value.hasOwnProperty(circuit) === true){
                const p = document.createElement('p');
                p.textContent = `${circuit}: ${value[circuit]}`;
                yearCont.append(p);
            }
        }

        preview.append(yearCont);
    }
}
