let drillPool = [], apPool = [], tasks = [], currentDrillItem = null;
let taskIdx = 0, lives = 3, score = 0, mode = "";

async function init() {
    try {
        const [dRes, aRes] = await Promise.all([fetch('data_drill.json'), fetch('data_ap_mode.json')]);
        drillPool = await dRes.json();
        apPool = await aRes.json();
    } catch(e) { console.error("Load Error"); }
    document.getElementById('btn-start-drill').onclick = startDrill;
    document.getElementById('btn-start-ap').onclick = startAP;
}

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

// --- DRILL MODE (SORTIEREN) ---
function startDrill() {
    mode = "drill"; lives = 3; score = 0;
    drillPool = shuffle(drillPool);
    taskIdx = 0;
    updateHUD();
    showScreen('drill');
    nextDrillWord();
}

function nextDrillWord() {
    if(taskIdx >= drillPool.length || lives <= 0) return endGame(lives > 0 ? "Win!" : "Game Over");
    currentDrillItem = drillPool[taskIdx];
    // Fix für "undefined": Wir nehmen das erste Wort, das wir finden (meist noun oder verb)
    let displayWord = currentDrillItem.noun?.[0] || currentDrillItem.verb?.[0] || currentDrillItem.adjective?.[0];
    document.getElementById('current-tap-word').innerText = displayWord;
}

function checkSort(category) {
    const displayWord = document.getElementById('current-tap-word').innerText;
    // Prüfen, ob das Wort in der gewählten Kategorie-Liste existiert
    if (currentDrillItem[category] && currentDrillItem[category].includes(displayWord)) {
        score += 10;
        taskIdx++;
        nextDrillWord();
    } else {
        lives--;
        updateHUD();
        if(lives <= 0) endGame("Game Over");
    }
}

// --- AP MODE (TIPPEN) ---
function startAP() {
    mode = "ap"; lives = 3; score = 0; taskIdx = 0;
    tasks = [];
    apPool.forEach(block => {
        block.gaps.forEach(gap => {
            tasks.push({ text: block.text, base_word: gap.base_word, solution: gap.solution });
        });
    });
    tasks = shuffle(tasks);
    updateHUD();
    showScreen('task');
    showTask();
}

function showTask() {
    if(taskIdx >= tasks.length || lives <= 0) return endGame("Fertig!");
    const t = tasks[taskIdx];
    document.getElementById('task-input').value = "";
    document.getElementById('task-hint').innerHTML = `Stammwort: <strong>${t.base_word}</strong>`;
    
    // ZENSUER: Ersetzt {1}, {2} etc. ODER das Lösungswort im Satz durch Striche
    let text = t.text || "";
    text = text.replace(/\{\d+\}/g, "________");
    t.solution.forEach(sol => {
        const regex = new RegExp(`\\b${sol}\\b`, 'gi');
        text = text.replace(regex, "________");
    });

    document.getElementById('task-display').innerText = text;
    renderKeyboard();
}

function renderKeyboard() {
    const cont = document.getElementById('app-keyboard');
    cont.innerHTML = "";
    const rows = [['Q','W','E','R','T','Z','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['⌫','Y','X','C','V','B','N','M','ENTER']];
    rows.forEach(row => {
        const div = document.createElement('div'); div.className = "keyboard-row";
        row.forEach(k => {
            const b = document.createElement('button'); b.className = "key";
            if(k==='⌫'||k==='ENTER') b.classList.add('action');
            if(k==='ENTER') b.classList.add('enter');
            b.innerText = k === 'ENTER' ? '⏎' : k;
            b.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                const inp = document.getElementById('task-input');
                if(k==='ENTER') checkAnswer();
                else if(k==='⌫') inp.value = inp.value.slice(0,-1);
                else inp.value += k.toLowerCase();
            });
            div.appendChild(b);
        });
        cont.appendChild(div);
    });
}

function checkAnswer() {
    const t = tasks[taskIdx];
    const val = document.getElementById('task-input').value.trim().toLowerCase();
    if (t.solution.some(s => s.toLowerCase() === val)) {
        score += 20; taskIdx++; showTask();
    } else {
        lives--; updateHUD();
        if(lives > 0) { tasks.push(tasks[taskIdx]); taskIdx++; showTask(); }
    }
}

function updateHUD() {
    document.getElementById('lives-container').innerText = "❤️".repeat(Math.max(0, lives));
    document.getElementById('score').innerText = score;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + '-screen').classList.remove('hidden');
    document.getElementById('top-bar').classList.toggle('hidden', id==='start'||id==='result');
}

function endGame(msg) {
    document.getElementById('result-title').innerText = msg;
    document.getElementById('final-score').innerText = score;
    showScreen('result');
}

window.onload = init;
