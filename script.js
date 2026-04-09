/* Version: #4 */

// === SEKSJON: Variabler og Elementer ===
const audioPlayer = document.getElementById('audio-player');
const audioUpload = document.getElementById('audio-upload');
const playlistEl = document.getElementById('playlist');
const currentTrackNameEl = document.getElementById('current-track-name');
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnStop = document.getElementById('btn-stop');
const btnVolUp = document.getElementById('btn-vol-up');
const btnVolDown = document.getElementById('btn-vol-down');
const volumeDisplay = document.getElementById('volume-display');

let audioFiles = []; // Array for å lagre fil-objektene (både lokale og fra GitHub)
let currentFileIndex = -1; // -1 betyr at ingen fil er valgt
let currentVolume = 1.0; // Standard volum er 100%

console.log("=== SEKSJON: Oppstart ===");
console.log("Applikasjon lastet. Venter på brukerinteraksjon...");

// Sett opp initialt volum
audioPlayer.volume = currentVolume;
volumeDisplay.textContent = `${Math.round(currentVolume * 100)}%`;


// === SEKSJON: Hent Lærerens Spilleliste (GitHub) ===
async function fetchTeacherPlaylist() {
    console.log("=== SEKSJON: Nettverkshenting ===");
    console.log("Søker etter spilleliste.json på serveren...");
    
    try {
        // Forsøker å laste inn JSON-filen
        const response = await fetch('spilleliste.json');
        
        if (!response.ok) {
            console.log("Fant ingen spilleliste.json (eller fikk nettverksfeil). Dette er helt greit, appen fungerer manuelt.");
            return; // Avbryter stille hvis filen ikke finnes
        }

        const data = await response.json();
        console.log(`Suksess! Fant spilleliste.json. Laster inn ${data.length} filer...`);

        // Legger de eksterne filene inn i hovedlisten
        data.forEach(filename => {
            audioFiles.push({
                name: filename,
                url: `lydfiler/${filename}`, // Peker automatisk til lydfiler-mappen
                isExternal: true // Markør for å skille dem fra lokale iPad-filer
            });
            console.log(`Lagt til lærerens fil i minnet: ${filename}`);
        });

        // Oppdaterer visningen for brukeren
        renderPlaylist();

    } catch (error) {
        console.error("En feil oppstod ved lesing av spilleliste.json (mulig skrivefeil i JSON-filen?):", error);
    }
}

// Kjør hentingen umiddelbart når scriptet starter
fetchTeacherPlaylist();


// === SEKSJON: Lokal Filopplasting (iPad) ===
audioUpload.addEventListener('change', (event) => {
    console.log("=== SEKSJON: Filopplasting ===");
    console.log("Bruker har trigget fil-dialogen på iPaden.");
    
    const files = event.target.files;
    if (files.length === 0) {
        console.log("Ingen filer ble valgt i dialogen. Avbryter.");
        return;
    }

    console.log(`Laster inn ${files.length} nye lokale fil(er)...`);

    // Frigi gamle lokale URL-er fra minnet for å forhindre minnelekkasjer
    audioFiles.forEach(fileObj => {
        if (!fileObj.isExternal && fileObj.url) {
            URL.revokeObjectURL(fileObj.url);
            console.log(`Frigitt gammelt minne for lokal fil: ${fileObj.name}`);
        }
    });

    // Fjern gamle lokale filer fra arrayen, men BEHOLD lærerens eksterne filer
    audioFiles = audioFiles.filter(fileObj => fileObj.isExternal);

    // Fyll på med de nye lokale filene
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Behandler lokal fil ${i + 1} av ${files.length}: ${file.name} (Type: ${file.type})`);
        
        audioFiles.push({
            name: file.name,
            url: URL.createObjectURL(file), // Skaper en lokal, midlertidig lenke til filen
            isExternal: false
        });
    }

    renderPlaylist();
    resetPlayer();
});


// === SEKSJON: Spilleliste ==
function renderPlaylist() {
    console.log("=== SEKSJON: Spilleliste ===");
    console.log("Bygger spilleliste i HTML...");
    playlistEl.innerHTML = ''; // Tømmer listen først

    if (audioFiles.length === 0) {
        playlistEl.innerHTML = '<li class="empty-list-msg">Ingen filer lastet inn enda. Trykk på knappen over for å velge filer.</li>';
        console.log("Spillelisten er tom.");
        return;
    }

    audioFiles.forEach((fileObj, index) => {
        const li = document.createElement('li');
        
        // Viser et litt annet ikon hvis det er en av lærerens filer vs elevens egne
        const icon = fileObj.isExternal ? '☁️' : '🎵';
        li.textContent = `${icon} ${fileObj.name}`;
        li.dataset.index = index;

        // Klikk-hendelse for hvert element i spillelisten
        li.addEventListener('click', () => {
            console.log(`Bruker trykket på spor i spillelisten: ${fileObj.name} (Indeks: ${index})`);
            loadTrack(index);
            playTrack();
        });

        playlistEl.appendChild(li);
    });
    console.log("Spilleliste ferdig generert og synlig for bruker.");
}

function updatePlaylistUI() {
    // Fjerner 'playing' klassen fra alle elementer
    const allItems = playlistEl.querySelectorAll('li');
    allItems.forEach(li => li.classList.remove('playing'));

    // Legger til 'playing' klassen på det aktive sporet for visuell feedback
    if (currentFileIndex !== -1 && allItems[currentFileIndex]) {
        allItems[currentFileIndex].classList.add('playing');
        console.log(`Markerte spor indeks ${currentFileIndex} som aktivt i visningen.`);
    }
}


// === SEKSJON: Spiller-logikk ===
function loadTrack(index) {
    console.log("=== SEKSJON: Laste Spor ===");
    if (index < 0 || index >= audioFiles.length) {
        console.error("Feil: Forsøkte å laste en ugyldig spor-indeks!", index);
        return;
    }

    currentFileIndex = index;
    const fileObj = audioFiles[index];
    console.log(`Laster spor inn i audio-elementet: ${fileObj.name} (Ekstern: ${fileObj.isExternal})`);

    audioPlayer.src = fileObj.url;
    currentTrackNameEl.textContent = fileObj.name;

    updatePlaylistUI();
    enableControls(true);
}

function resetPlayer() {
    console.log("=== SEKSJON: Nullstilling ===");
    console.log("Nullstiller avspillerens status og stenger knapper.");
    currentFileIndex = -1;
    audioPlayer.src = '';
    currentTrackNameEl.textContent = 'Ingen fil valgt';
    enableControls(false);
    updatePlaylistUI();
}

function enableControls(enable) {
    btnPlay.disabled = !enable;
    btnPause.disabled = !enable;
    btnStop.disabled = !enable;
    console.log(`Avspillingsknappene (Play, Pause, Stopp) er nå satt til: ${enable ? 'Aktivert' : 'Deaktivert'}.`);
}


// === SEKSJON: Avspillings-kontroller ===
function playTrack() {
    console.log("=== SEKSJON: Avspilling ===");
    if (currentFileIndex === -1) {
        console.warn("Avviser play-kommando: Ingen fil er valgt.");
        return;
    }
    console.log("Starter avspilling...");
    audioPlayer.play().then(() => {
        console.log("Avspilling pågår vellykket.");
    }).catch(err => {
        console.error("En feil oppstod under avspilling. Mulig iPad browser restriksjon før interaksjon:", err);
    });
}

function pauseTrack() {
    console.log("=== SEKSJON: Pause ===");
    console.log("Setter avspilleren på pause.");
    audioPlayer.pause();
}

function stopTrack() {
    console.log("=== SEKSJON: Stopp ===");
    console.log("Stopper avspilling og spoler tilbake til 00:00.");
    audioPlayer.pause();
    audioPlayer.currentTime = 0; // Spoler tilbake
}

// Koble funksjonene til knappene i HTML
btnPlay.addEventListener('click', playTrack);
btnPause.addEventListener('click', pauseTrack);
btnStop.addEventListener('click', stopTrack);

// Lytte etter når sanger er ferdig spilt
audioPlayer.addEventListener('ended', () => {
    console.log("=== SEKSJON: Spor Ferdig ===");
    console.log("Lydsporet er ferdig avspilt automatisk.");
    stopTrack(); // Stopper sirkuleringen.
});


// === SEKSJON: Volum ===
function updateVolume(change) {
    console.log("=== SEKSJON: Volumkontroll ===");
    let newVolume = audioPlayer.volume + change;

    // Begrens volumet mellom 0.0 (mute) og 1.0 (maks)
    if (newVolume > 1.0) newVolume = 1.0;
    if (newVolume < 0.0) newVolume = 0.0;

    audioPlayer.volume = newVolume;
    currentVolume = newVolume;

    const displayVol = Math.round(newVolume * 100);
    volumeDisplay.textContent = `${displayVol}%`;
    console.log(`Endret volum. Nytt nivå: ${displayVol}% (Verdi: ${newVolume.toFixed(2)})`);
}

btnVolUp.addEventListener('click', () => updateVolume(0.1));
btnVolDown.addEventListener('click', () => updateVolume(-0.1));

/* Version: #4 */
