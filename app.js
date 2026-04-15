// --- GLOBALE VARIABLEN ---
let drillPool = [], apPool = [], tasks = [], currentDrillItem = null;
let taskIdx = 0, lives = 3, score = 0, mode = "";

// --- 1. INITIALISIERUNG ---
async function init() {
    try {
        // Daten von GitHub/Server laden
        const [dRes, aRes] = await Promise.all([
            fetch('data_drill.json'), 
            fetch('data_ap_mode.json')
        ]);
        drillPool = await dRes.json();
        apPool = await aRes.json();
    } catch(e) { 
        console.error("Fehler beim Laden der JSON-Daten. Stelle sicher, dass die Dateien im selben Ordner liegen.", e); 
    }

    // Event-Listener für die Start-Buttons
    document.getElementById('btn-start-drill').onclick = startDrill;
    document.getElementById('btn-start-ap').onclick = startAP;
}

// Hilfsfunktion zum Mischen von Arrays
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

// --- 2. DRILL MODE (SORTIEREN) ---
function startDrill() {
    mode = "drill"; 
    lives = 3; 
    score = 0; 
    taskIdx = 0;
    drillPool = shuffle(drillPool); // Zufällige Reihenfolge
    updateHUD();
    showScreen('drill');
    nextDrillWord();
}

function nextDrillWord() {
    if(taskIdx >= drillPool.length || lives <= 0) {
        return endGame(lives > 0 ? "Alle Wörter sortiert!" : "Game Over");
    }

    currentDrillItem = drillPool[taskIdx];

    // FIX für "undefined": Wir suchen das erste Wort, das in irgendeiner Kategorie existiert
    const wordToDisplay = 
        (currentDrillItem.noun && currentDrillItem.noun[0]) || 
        (currentDrillItem.verb && currentDrillItem.verb[0]) || 
        (currentDrillItem.adjective && currentDrillItem.adjective[0]) ||
        (currentDrillItem.adverb && currentDrillItem.adverb[0]);

    if (!wordToDisplay) {
        taskIdx++; // Falls das Datenobjekt leer ist, zum nächsten springen
        return nextDrillWord();
    }

    document.getElementById('current-tap-word').innerText = wordToDisplay;
}

// Wird von den Buttons im Drill-Screen aufgerufen
function checkSort(category) {
    const word = document.getElementById('current-tap-word').innerText;
    
    // Prüfen, ob das Wort in der gewählten Liste (noun, verb, etc.) enthalten ist
    if (currentDrillItem[category] && currentDrillItem[category].includes(word)) {
        score += 10;
        taskIdx++;
        nextDrillWord();
    } else {
        lives--;
        updateHUD();
        if(lives <= 0) endGame("Game Over");
    }
}

// --- 3. AP MODE (TIPPEN) ---
function startAP() {
    mode = "ap"; 
    lives = 3; 
    score = 0; 
    taskIdx = 0;
    tasks = [];

    // Alle Lücken aus allen Textblöcken in eine flache Liste umwandeln
    apPool.forEach(block => {
        block.gaps.forEach(gap => {
            tasks.push({
                text: block.text,
                base_word: gap.base_word,
                solution: gap.solution
            });
        });
    });

    tasks = shuffle(tasks);
    updateHUD();
    showScreen('task');
    showTask();
}

function showTask() {
    if(taskIdx >= tasks.length || lives <= 0) {
        return endGame("Boot Camp abgeschlossen!");
    }

    const t = tasks[taskIdx];
    document.getElementById('task-input').value = ""; // Input leeren
    document.getElementById('task-hint').innerHTML = `Stammwort: <strong>${t.base_word}</strong>`;

    // --- ZENSUER-LOGIK (Verhindert, dass die Lösung im Satz steht) ---
    let textToDisplay = t.text || "";
    
    // Ersetzt Platzhalter wie {1}, {2} durch Unterstriche
    textToDisplay = textToDisplay.replace(/\{\d+\}/g, "________");

    // Ersetzt die tatsächlichen Lösungswörter im Satz (falls sie dort vorkommen)
    if (t.solution) {
        t.solution.forEach(sol => {
            const regex = new RegExp(`\\b${sol}\\b`, 'gi');
            textToDisplay = textToDisplay.replace(regex, "________");
        });
    }

    document.getElementById('task-display').innerText = textToDisplay;
    renderKeyboard();
}

// --- 4. TASTATUR-LOGIK (QWERTZ) ---
function renderKeyboard() {
    const cont = document.getElementById('app-keyboard');
    cont.innerHTML = ""; // Reset
    
    const layout = [
        ['Q','W','E','R','T','Z','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['⌫','Y','X','C','V','B','N','M','ENTER']
    ];

    layout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = "keyboard-row";
        
        row.forEach(k => {
            const b = document.createElement('button'); 
            b.className = "key"; 
            
            if (k === 'ENTER') {
                b.innerText = "⏎";
                b.classList.add('action', 'enter');
                // pointerdown ist auf dem iPhone deutlich schneller als click
                b.addEventListener('pointerdown', (e) => { 
                    e.preventDefault(); 
                    checkAnswer(); 
                });
            } else if (k === '⌫') {
                b.innerText = "⌫";
                b.classList.add('action');
                b.addEventListener('pointerdown', (e) => { 
                    e.preventDefault(); 
                    let i = document.getElementById('task-input'); 
                    i.value = i.value.slice(0, -1); 
                });
            } else {
                b.innerText = k;
                b.addEventListener('pointerdown', (e) => {
                    e.preventDefault(); 
                    document.getElementById('task-input').value += k.toLowerCase();
                });
            }
            rowDiv.appendChild(b);
        });
        cont.appendChild(rowDiv);
    });
}

function checkAnswer() {
    const t = tasks[taskIdx];
    const val = document.getElementById('task-input').value.trim().toLowerCase();
    
    // Prüfen, ob die Eingabe in der Lösungsliste ist
    const isCorrect = t.solution.some(s => s.toLowerCase() === val);

    if (isCorrect) {
        score += 20; 
        taskIdx++;
        showTask();
    } else {
        lives--; 
        updateHUD();
        if (lives > 0) {
            // Bei Fehler: Den Task ans Ende schieben zum erneuten Versuchen
            tasks.push(tasks[taskIdx]);
            taskIdx++;
            showTask();
        }
    }
}

// --- 5. UI & HILFSFUNKTIONEN ---
function updateHUD() {
    document.getElementById('lives-container').innerText = "❤️".repeat(Math.max(0, lives));
    document.getElementById('score').innerText = score;
}

function showScreen(id) {
    // Alle Screens verstecken
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    
    // Gewünschten Screen zeigen
    const target = document.getElementById(id + '-screen');
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    
    // Top-Bar nur im Spiel zeigen
    const topBar = document.getElementById('top-bar');
    if(id === 'start' || id === 'result') {
        topBar.classList.add('hidden');
    } else {
        topBar.classList.remove('hidden');
    }
}

function endGame(msg) {
    document.getElementById('result-title').innerText = msg;
    document.getElementById('final-score').innerText = score;
    showScreen('result');
}

// App starten, wenn die Seite geladen ist
window.onload = init;
