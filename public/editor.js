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
        placeholder: 'Select a circuit and class first',
    });
    groupSelect.disable();
}

function getSelectedRadio(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
}

function updateGroupOptions() {
    const circuit = getSelectedRadio('circuit');
    const theClass = getSelectedRadio('class');

    groupSelect.clear();
    groupSelect.clearOptions();

    if (!circuit || !theClass) {
        groupSelect.disable();
        return;
    }

    const filtered = allGroups.filter(g => g.circuit === circuit && g.class === theClass);

    groupSelect.addOptions(filtered);
    groupSelect.enable();
}

document.querySelectorAll('input[name="circuit"], input[name="class"]')
    .forEach(radio => radio.addEventListener('change', updateGroupOptions));

loadGroups(); //DONT DO AUTOMATICALLY

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

function getUserEmail() {
    return 'plzenteryt@gmail.com'
    //change this obviously
}

function addStatusElements(groupId, year, success){
    if(success === true){
        const groupName = document.querySelector(`option[value="${groupId}"`).textContent;
        conf.textContent = `Successfully added ${groupName} ${year} to your experience`;
    }
    else{
        conf.textContent = `ERROR: Please try again`;
    }
}

async function addExpr(group, year, key) {
    const email = getUserEmail();

    const response = await fetch('/api/add-expr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, group, year, key })
    });

    addStatusElements(group, year, response.ok);
}