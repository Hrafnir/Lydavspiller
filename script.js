/* Version: #6 */

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

// NYE variabler for tidslinjen
const progressBar = document.getElementById('progress-bar');
const timeCurrentDisplay = document.getElementById('time-current');
const timeTotalDisplay = document.getElementById('time-total');

let audioFiles = []; // Array for å lagre fil-objektene (både lokale og fra GitHub)
let currentFileIndex = -1; // -1 betyr at ingen fil er valgt
let currentVolume = 1.0; // Standard volum er 100%

console.log("=== SEKSJON: Oppstart ===");
console.log("Applikasjon lastet. Venter på brukerinteraksjon...");

// Sett opp initialt volum
audioPlayer.volume = currentVolume;
volumeDisplay.textContent = `${Math.round(currentVolume * 100)}%`;


// === SEKSJON: Hjelpefunksjoner ===
// Omformer sekunder (f.eks. 65) til formatet MM:SS (f.eks. 01:05)
function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}


// === SEKSJON: Hent Lærerens Spilleliste (GitHub) ===
async function fetchTeacherPlaylist() {
    console.log("=== SEKSJON: Nettverkshenting ===");
    console.log("Søker etter spilleliste.json på serveren...");
    
    try {
        // Forsøker å laste inn JSON-filen
        const response = await fetch('spilleliste.json');
        
        if (!response.ok) {
            console.log("Fant ingen spilleliste.json (eller fikk nettverksfeil). Appen fungerer fortsatt for manuelle filer.");
            playlistEl.innerHTML = '<li class="empty-list-msg">Ingen filer funnet på serveren. Du kan laste opp egne filer nedenfor.</li>';
            return;
        }

        const data = await response.json();
        console.log(`Suksess! Fant spilleliste.json. Laster inn ${data.length} filer...`);

        // Legger de eksterne filene inn i hovedlisten
        data.forEach(filename => {
            audioFiles.push({
                name: filename,
                url: `lydfiler/${filename}`, // Peker automatisk til lydfiler-mappen
                isExternal: true 
            });
            console.log(`Lagt til lærerens fil i minnet: ${filename}`);
        });

        // Oppdaterer visningen for brukeren
        renderPlaylist();

        // NYTT: Hvis vi fant filer, gjør den øverste filen klar for avspilling med en gang!
        if (audioFiles.length > 0) {
            console.log("Auto-laster første spor fra spilleliste.json for enkel start.");
            loadTrack(0);
        }

    } catch (error) {
        console.error("En feil oppstod ved lesing av spilleliste.json:", error);
        playlistEl.innerHTML = '<li class="empty-list-msg">Feil ved innlasting av filer. Sjekk console.</li>';
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
    // Laster den første av de nye filene hvis det ikke spilles noe
    if (currentFileIndex === -1 && audioFiles.length > 0) {
        loadTrack(0);
    } else {
        resetPlayer();
    }
});


// === SEKSJON: Spilleliste ==
function renderPlaylist() {
    console.log("=== SEKSJON: Spilleliste ===");
    console.log("Bygger spilleliste i HTML...");
    playlistEl.innerHTML = ''; // Tømmer listen først

    if (audioFiles.length === 0) {
        playlistEl.innerHTML = '<li class="empty-list-msg">Ingen filer lastet inn enda. Trykk på knappen nedenfor for å velge filer.</li>';
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
    updatePlaylistUI();
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

    // Nullstill tidsvisning før metadata er lastet
    progressBar.value = 0;
    timeCurrentDisplay.textContent = "00:00";
    timeTotalDisplay.textContent = "00:00";
    
    updatePlaylistUI();
    enableControls(true);
}

function resetPlayer() {
    console.log("=== SEKSJON: Nullstilling ===");
    console.log("Nullstiller avspillerens status og stenger knapper.");
    currentFileIndex = -1;
    audioPlayer.src = '';
    currentTrackNameEl.textContent = 'Ingen fil valgt';
    
    progressBar.value = 0;
    progressBar.disabled = true;
    timeCurrentDisplay.textContent = "00:00";
    timeTotalDisplay.textContent = "00:00";

    enableControls(false);
    updatePlaylistUI();
}

function enableControls(enable) {
    btnPlay.disabled = !enable;
    btnPause.disabled = !enable;
    btnStop.disabled = !enable;
    console.log(`Avspillingsknappene er nå satt til: ${enable ? 'Aktivert' : 'Deaktivert'}.`);
}


// === SEKSJON: Avspilling og Tidslinje (Fremdriftslinje) ===

// Lytter på oppdatering av tiden fra lydfilen mens den spiller
audioPlayer.addEventListener('timeupdate', () => {
    // Sjekker at duration finnes, for å unngå NaN (Not a Number) feil
    if (audioPlayer.duration) {
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progressPercent;
        timeCurrentDisplay.textContent = formatTime(audioPlayer.currentTime);
    }
});

// Når filens metadata (som lengde) er lastet inn, oppdater totaltiden
audioPlayer.addEventListener('loadedmetadata', () => {
    timeTotalDisplay.textContent = formatTime(audioPlayer.duration);
    progressBar.disabled = false; // Aktiverer spole-baren for brukeren
    console.log(`Metadata lastet. Sporets totale lengde er: ${formatTime(audioPlayer.duration)}`);
});

// Lar brukeren spole ved å dra i fremdriftslinjen
progressBar.addEventListener('input', () => {
    if (audioPlayer.duration) {
        const seekTime = (progressBar.value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = seekTime;
        console.log(`Bruker spoler til: ${formatTime(seekTime)}`);
    }
});

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
        console.error("En feil oppstod under avspilling. Mulig iPad browser restriksjon:", err);
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
    stopTrack(); 
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
    console.log(`Endret volum. Nytt nivå: ${displayVol}%`);
}

btnVolUp.addEventListener('click', () => updateVolume(0.1));
btnVolDown.addEventListener('click', () => updateVolume(-0.1));

/* Version: #6 */
