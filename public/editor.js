// document.getElementById('filter-groups').addEventListener('submit', function(event) {
//     event.preventDefault();

//     const circuit = document.querySelector('input[name="circuit"]:checked').value;
//     const theClass = document.querySelector('input[name="class"]:checked').value;
//     const instrument = document.querySelector('input[name="instrument"]:checked')?.value || null;
//     console.log(circuit, theClass, instrument);
//     getGroups(circuit, theClass, instrument);
    
// });

//old stuff to look at^^^

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

loadGroups();

// to add to DB

document.getElementById('add-exp').addEventListener('submit', function(event) {
    event.preventDefault();

    const group = document.getElementById('group-select').value;
    const year = document.getElementById('year-marched').value;
    const key = document.getElementById('key').value;

    console.log(group, year, key);
    addExpr(group, year, key);
});

function getUserEmail() {
    return 'plzenteryt@gmail.com'
    //change this obviously
}

async function addExpr(group, year, key) {
    const email = getUserEmail();

    const response = await fetch('/api/add-expr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, group, year, key })
    });

    if (response.ok) {
        // document.getElementById('check').textContent = 'Check your email!';
        // document.getElementById('login-form').style.display = 'none';
        console.log('its ok');
    } else {
        // document.getElementById('check').textContent = 'Something went wrong. Try again.';
    }
    
}