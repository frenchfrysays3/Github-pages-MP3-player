// Get the UI containers and text elements
const playlistSelect       = document.getElementById('playlist-select');
const playlistMenuContainer = document.getElementById('playlist-menu');
const albumArtHtml          = document.getElementById('album-art');
const songTitleHtml         = document.getElementById('song-name');
const albumNameHtml         = document.getElementById('album-name');
const artistNameHtml        = document.getElementById('album-artist');

const previousTrackBtn      = document.getElementById('previous-track');
const playPauseBtn          = document.getElementById('play-pause');
const playPauseIcon         = document.getElementById('play-pause-icon');
const nextTrackBtn          = document.getElementById('next-track');

// Audio element reference
const audioPlayer           = document.getElementById("my-audio-element");

// Helper tracking states
let playPauseState         = 0;    
let activeQueue            = [];   
let currentTrackIndex      = 0;    
let currentlyPlayingSongId = null; 

// NEW: Function to load index registry and populate the HTML select dropdown
async function loadPlaylistIndex() {
    try {
        const response = await fetch("index.json");
        if (!response.ok) throw new Error("Could not load index.json registry");
        
        const playlistsArray = await response.json();
        
        if (!playlistSelect) return;
        playlistSelect.innerHTML = ""; // Clear any placeholder elements

        // Loop through index array and create option nodes dynamically
        playlistsArray.forEach((playlist) => {
            const option = document.createElement("option");
            option.value = playlist.file; // e.g. "chill.json"
            option.textContent = playlist.name; // e.g. "☕ Chill Lofi Vibe"
            playlistSelect.appendChild(option);
        });

        // Automatically load the very first playlist entry found in our index file
        if (playlistsArray.length > 0) {
            fetchAndSwitchPlaylist(playlistsArray[0].file);
        }

    } catch (error) {
        console.error("Error building playlist selector index menu:", error);
    }
}

// Dynamic JSON fetch handling for separate files
async function fetchAndSwitchPlaylist(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`Could not load playlist data: ${fileName}`);
        
        activeQueue = await response.json();
        
        renderPlaylistMenu();
        loadTrack(0);
        
    } catch (error) {
        console.error("Error swapping playlist files:", error);
    }
}

// Helper function to update audio node elements natively
function loadTrack(index) {
    if (activeQueue.length === 0) return;
    
    const track = activeQueue[index];
    currentTrackIndex = index;
    currentlyPlayingSongId = track.id;
    
    audioPlayer.src = track.src;
    
    if (albumArtHtml)  albumArtHtml.src = track.cover;
    if (songTitleHtml) songTitleHtml.textContent = track.title;
    if (albumNameHtml) albumNameHtml.textContent = track.album || '';
    if (artistNameHtml) artistNameHtml.textContent = track.artist;
    
    updateActiveMenuHighlight();
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album || '',
            artwork: [{ src: track.cover, sizes: '512x512', type: 'image/png' }]
        });
    }
    
    if (playPauseState === 1) {
        audioPlayer.play().catch(err => console.log("Playback interrupted:", err));
    }
}

function loadTrackById(songId) {
    const targetIndex = activeQueue.findIndex(track => track.id === songId);
    if (targetIndex !== -1) {
        loadTrack(targetIndex);
    }
}

function renderPlaylistMenu() {
    if (!playlistMenuContainer) return;
    playlistMenuContainer.innerHTML = ""; 

    activeQueue.forEach((track) => {
        const trackRow = document.createElement("div");
        trackRow.className = "track-item";
        trackRow.setAttribute("data-song-id", track.id); 
        trackRow.textContent = `${track.title} - ${track.artist}`;

        trackRow.addEventListener("click", () => {
            loadTrackById(track.id);
            if (playPauseState === 0) togglePlayPause(); 
        });

        playlistMenuContainer.appendChild(trackRow);
    });
}

function updateActiveMenuHighlight() {
    const allRows = document.querySelectorAll(".track-item");
    allRows.forEach(row => {
        if (row.getAttribute("data-song-id") === currentlyPlayingSongId) {
            row.classList.add("active-track");
        } else {
            row.classList.remove("active-track");
        }
    });
}

function togglePlayPause() {
    if (activeQueue.length === 0) return;

    if (playPauseState === 0) {
        audioPlayer.play()
            .then(() => {
                playPauseState = 1;
                if (playPauseIcon) playPauseIcon.textContent = "⏸";
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";
            })
            .catch(err => console.error("Playback blocked:", err));
    } else {
        audioPlayer.pause();
        playPauseState = 0;
        if (playPauseIcon) playPauseIcon.textContent = "▶";
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
    }
}

function nextTrack() {
    if (activeQueue.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % activeQueue.length;
    loadTrack(nextIndex);
}

function previousTrack() {
    if (activeQueue.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + activeQueue.length) % activeQueue.length;
    loadTrack(prevIndex);
}

// App Startup Engine Initialization
document.addEventListener("DOMContentLoaded", () => {
    // 1. Kick off the index mapping process
    loadPlaylistIndex();

    // 2. Setup the event listener for selector dropdown manual interactions
    if (playlistSelect) {
        playlistSelect.addEventListener("change", (event) => {
            fetchAndSwitchPlaylist(event.target.value);
        });
    }

    // 3. UI Buttons Wire Up
    if (playPauseBtn)     playPauseBtn.addEventListener("click", togglePlayPause);
    if (nextTrackBtn)      nextTrackBtn.addEventListener("click", nextTrack);
    if (previousTrackBtn)  previousTrackBtn.addEventListener("click", previousTrack);

    audioPlayer.addEventListener("ended", nextTrack);

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', togglePlayPause);
        navigator.mediaSession.setActionHandler('pause', togglePlayPause);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
        navigator.mediaSession.setActionHandler('previoustrack', previousTrack);
    }
});
