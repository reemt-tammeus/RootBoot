// --- 1. GLOBALE VARIABLEN (Der Zustand der App) ---
let drillData = [];      // Hier speichern wir die 240 Wortfamilien
let currentDrillItem = null; // Das aktuell gesuchte Wort
let targetType = "";     // Was gesucht wird (noun, verb, adjective, adverb)
let lives = 3;
let score = 0;

// --- 2. DOM-ELEMENTE SAMMELN ---
const screens = {
    start: document.getElementById('start-screen'),
    drill: document.getElementById('drill-screen'),
    ap: document.getElementById('ap-screen'),
    result: document.getElementById('result-screen')
};

const topBar = document.getElementById('top-bar');
const livesDisplay = document.getElementById('lives-container');
const scoreDisplay = document.getElementById('score');
const drillInput = document.getElementById('drill-input');
const drillWordDisplay = document.getElementById('drill-word');
const drillLabel = document.querySelector('#drill-screen .label');

// --- 3. APP INITIALISIEREN ---
async function initApp() {
    try {
        // Daten aus der JSON-Datei laden (die Datei muss im selben Ordner liegen!)
        const response = await fetch('data_drill.json');
        drillData = await response.json();
        console.log("Drill-Daten geladen:", drillData.length, "Wortfamilien");
    } catch (error) {
        console.error("Fehler beim Laden der Daten. Läuft die App auf einem Server/Localhost?", error);
        alert("Fehler beim Laden der Vokabeln! (Siehe Konsole)");
    }

    // Event-Listener für die Menü-Buttons
    document.getElementById('btn-start-drill').addEventListener('click', startDrillMode);
    document.getElementById('btn-restart').addEventListener('click', backToMenu);
    
    // Prüfen-Button im Drill Mode
    document.getElementById('btn-check-drill').addEventListener('click', checkDrillAnswer);

    // Tastatur für den Drill-Mode bauen
    buildKeyboard('drill-keyboard', drillInput);
}

// --- 4. NAVIGATION & SPIELSTEUERUNG ---
function showScreen(screenName) {
    // Alle Screens verstecken
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    // Gewünschten Screen zeigen
    screens[screenName].classList.add('active');
}

function updateHUD() {
    scoreDisplay.innerText = score;
    livesDisplay.innerText = "❤️".repeat(lives);
    if (lives <= 0) gameOver();
}

function backToMenu() {
    topBar.classList.add('hidden');
    showScreen('start');
}

function gameOver() {
    topBar.classList.add('hidden');
    document.getElementById('final-score').innerText = score;
    showScreen('result');
}

// --- 5. DRILL-MODE LOGIK ---
function startDrillMode() {
    if (drillData.length === 0) return alert("Daten laden noch...");
    
    lives = 3;
    score = 0;
    topBar.classList.remove('hidden');
    updateHUD();
    
    loadNextDrillQuestion();
    showScreen('drill');
}

function loadNextDrillQuestion() {
    // 1. Zufällige Wortfamilie auswählen
    const randomIndex = Math.floor(Math.random() * drillData.length);
    currentDrillItem = drillData[randomIndex];

    // 2. Was wollen wir abfragen? Wir picken zufällig Nomen, Verb oder Adjektiv
    const possibleTargets = [];
    if (currentDrillItem.noun && currentDrillItem.noun.length > 0) possibleTargets.push('noun');
    if (currentDrillItem.verb && currentDrillItem.verb.length > 0) possibleTargets.push('verb');
    if (currentDrillItem.adjective && currentDrillItem.adjective.length > 0) possibleTargets.push('adjective');

    // Falls eine Wortfamilie mal unvollständig ist, neu würfeln
    if (possibleTargets.length < 2) return loadNextDrillQuestion();

    // Ziel-Kategorie (Was gesucht wird)
    targetType = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
    
    // Quell-Kategorie (Was angezeigt wird - darf nicht dasselbe sein!)
    let sourceType = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
    while (sourceType === targetType) {
        sourceType = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
    }

    // 3. UI updaten
    const displayWord = currentDrillItem[sourceType][0].toUpperCase();
    drillWordDisplay.innerText = displayWord;
    drillInput.value = ""; // Eingabefeld leeren

    // Label anpassen (z.B. "Bilde das Nomen zu:")
    const labels = {
        'noun': 'Bilde das Nomen zu:',
        'verb': 'Bilde das Verb zu:',
        'adjective': 'Bilde das Adjektiv zu:'
    };
    drillLabel.innerText = labels[targetType];
}

function checkDrillAnswer() {
    const userAnswer = drillInput.value.trim().toLowerCase();
    if (userAnswer === "") return; // Nichts eingegeben

    // Mögliche korrekte Lösungen aus dem Array holen
    const correctAnswers = currentDrillItem[targetType].map(word => word.toLowerCase());

    if (correctAnswers.includes(userAnswer)) {
        // RICHTIG
        score += 10;
        // Kurzes visuelles Feedback (z.B. grün aufblinken)
        drillInput.style.color = "var(--success)";
        setTimeout(() => {
            drillInput.style.color = "var(--text-main)";
            updateHUD();
            loadNextDrillQuestion();
        }, 500);
    } else {
        // FALSCH
        lives--;
        drillInput.style.color = "var(--danger)";
        setTimeout(() => {
            drillInput.style.color = "var(--text-main)";
            drillInput.value = ""; // Feld leeren für neuen Versuch
            updateHUD();
        }, 500);
    }
}

// --- 6. CUSTOM KEYBOARD ---
function buildKeyboard(containerId, inputElement) {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Leeren
    
    // QWERTZ Layout
    const layout = [
        "Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P",
        "A", "S", "D", "F", "G", "H", "J", "K", "L",
        "Y", "X", "C", "V", "B", "N", "M", "DEL"
    ];

    layout.forEach(key => {
        const btn = document.createElement('button');
        btn.innerText = key;
        btn.className = key === "DEL" ? "key action" : "key";
        
        btn.addEventListener('click', () => {
            if (key === "DEL") {
                inputElement.value = inputElement.value.slice(0, -1);
            } else {
                inputElement.value += key.toLowerCase();
            }
        });
        
        container.appendChild(btn);
    });
}

// --- APP STARTEN ---
initApp();