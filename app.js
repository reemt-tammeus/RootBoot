let drillPool = [], apPool = [], tasks = [];
let taskIdx = 0, lives = 3, score = 0, mode = "";

// 1. Initialisierung & Daten laden
async function init() {
    try {
        const [dRes, aRes] = await Promise.all([
            fetch('data_drill.json'), 
            fetch('data_ap_mode.json')
        ]);
        drillPool = await dRes.json();
        apPool = await aRes.json();
    } catch(e) { 
        console.error("Fehler beim Laden der Daten:", e); 
    }

    document.getElementById('btn-start-drill').onclick = startDrill;
    document.getElementById('btn-start-ap').onclick = startAP;
}

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

// 2. Spiel-Modi starten
function startDrill() {
    mode = "drill"; 
    lives = 3; score = 0; taskIdx = 0;
    // Wir nehmen zufällige Wörter aus dem DrillPool für den Typing-Modus
    tasks = shuffle(drillPool).map(item => ({
        base_word: item.id, // ID als Orientierung oder Stammwort
        sentence: item.sentence,
        solution: [...(item.noun || []), ...(item.verb || []), ...(item.adjective || []), ...(item.adverb || [])]
    }));
    updateHUD();
    showScreen('task');
    showTask();
}

function startAP() {
    mode = "ap"; 
    lives = 3; score = 0; taskIdx = 0;
    // AP-Blöcke in einzelne Tasks umwandeln
    tasks = [];
    apPool.forEach(block => {
        block.gaps.forEach(gap => {
            tasks.push({
                text: block.text,
                base_word: gap.base_word,
                solution: gap.solution,
                gapId: gap.id
            });
        });
    });
    tasks = shuffle(tasks);
    updateHUD();
    showScreen('task');
    showTask();
}

// 3. Task Anzeige (mit ZENSUER)
function showTask() {
    if(taskIdx >= tasks.length || lives <= 0) {
        endGame(lives > 0 ? "Gewonnen!" : "Game Over");
        return;
    }

    const t = tasks[taskIdx];
    document.getElementById('task-input').value = "";
    document.getElementById('task-hint').innerHTML = `Stammwort: <strong>${t.base_word || "?"}</strong>`;

    let textToDisplay = t.sentence || t.text || "";

    // ZENSUER-LOGIK
    if (textToDisplay.includes("{")) {
        // AP Mode: Ersetze {1}, {2} etc.
        // Wir markieren nur den aktuellen Gap speziell oder alle gleich
        textToDisplay = textToDisplay.replace(/\{\d+\}/g, "________");
    } else if (t.solution) {
        // Drill Mode: Suche die Lösungswörter im Satz und zensiere sie
        t.solution.forEach(sol => {
            const regex = new RegExp(`\\b${sol}\\b`, 'gi');
            textToDisplay = textToDisplay.replace(regex, "________");
        });
    }

    document.getElementById('task-display').innerText = textToDisplay;
    renderKeyboard();
}

// 4. QWERTZ Tastatur
function renderKeyboard() {
    const cont = document.getElementById('app-keyboard');
    cont.innerHTML = "";
    
    const rows = [
        ['Q','W','E','R','T','Z','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['⌫','Y','X','C','V','B','N','M','ENTER']
    ];

    rows.forEach(rowKeys => {
        const rowDiv = document.createElement('div');
        rowDiv.className = "keyboard-row";
        rowKeys.forEach(k => {
            const b = document.createElement('button');
            b.className = "key";
            if(k === '⌫') b.classList.add('action');
            if(k === 'ENTER') b.classList.add('action', 'enter');
            
            b.innerText = k === 'ENTER' ? '⏎' : k;

            b.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                const input = document.getElementById('task-input');
                if(k === 'ENTER') {
                    checkAnswer();
                } else if(k === '⌫') {
                    input.value = input.value.slice(0, -1);
                } else {
                    input.value += k.toLowerCase();
                }
            });
            rowDiv.appendChild(b);
        });
        cont.appendChild(rowDiv);
    });
}

// 5. Logik & HUD
function checkAnswer() {
    const t = tasks[taskIdx];
    const val = document.getElementById('task-input').value.trim().toLowerCase();
    const isCorrect = t.solution.some(s => s.toLowerCase() === val);

    if (isCorrect) {
        score += 20;
        taskIdx++;
        showTask();
    } else {
        lives--;
        updateHUD();
        if(lives > 0) {
            // Bei Fehler: Task ans Ende schieben zum Wiederholen
            tasks.push(tasks[taskIdx]);
            taskIdx++;
            showTask();
        }
    }
}

function updateHUD() {
    document.getElementById('lives-container').innerText = "❤️".repeat(Math.max(0, lives));
    document.getElementById('score').innerText = score;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'hidden'));
    document.querySelectorAll('.screen').forEach(s => s.id !== id + '-screen' ? s.classList.add('hidden') : s.classList.add('active'));
    document.getElementById('top-bar').classList.toggle('hidden', id === 'start' || id === 'result');
}

function endGame(msg) {
    document.getElementById('result-title').innerText = msg;
    document.getElementById('final-score').innerText = score;
    showScreen('result');
}

window.onload = init;
