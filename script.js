// Get the UI containers and text elements
const playlistMenuContainer = document.getElementById('playlist-menu'); // Container for track lists
const albumArtHtml          = document.getElementById('album-art');
const songTitleHtml         = document.getElementById('song-name');
const albumNameHtml         = document.getElementById('album-name');
const artistNameHtml        = document.getElementById('album-artist');

const previousTrackBtn      = document.getElementById('previous-track');
const playPauseBtn          = document.getElementById('play-pause');
const playPauseIcon         = document.getElementById('play-pause-icon');
const nextTrackBtn          = document.getElementById('next-track');

// Audio element reference
const audioPlayer           = document.getElementById("audio");

// Helper tracking states
let playPauseState         = 0;    // 0 = Not playing; 1 = playing
let activeQueue            = [];   // Current playlist array
let currentTrackIndex      = 0;    // Points to the active item position in array
let currentlyPlayingSongId = null; // Stores the current string ID

// Helper function to update elements natively
function loadTrack(index) {
    if (activeQueue.length === 0) return;
    
    const track = activeQueue[index];
    currentTrackIndex = index;
    currentlyPlayingSongId = track.id; // Update our global ID indicator
    
    // 1. Set audio file source
    audioPlayer.src = track.src;
    
    // 2. Update visual web elements
    if (albumArtHtml)  albumArtHtml.src = track.cover;
    if (songTitleHtml) songTitleHtml.textContent = track.title;
    if (albumNameHtml) albumNameHtml.textContent = track.album || '';
    if (artistNameHtml) artistNameHtml.textContent = track.artist;
    
    // 3. Highlight the playing item in the menu layout
    updateActiveMenuHighlight();
    
    // 4. Sync with OS Media Controls
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

// Function to find an item index matching our exact structural ID string
function loadTrackById(songId) {
    const targetIndex = activeQueue.findIndex(track => track.id === songId);
    if (targetIndex !== -1) {
        loadTrack(targetIndex);
    } else {
        console.error(`Song ID ${songId} not found in the current active queue.`);
    }
}

// Dynamically generate clickable elements for your track UI list
function renderPlaylistMenu() {
    if (!playlistMenuContainer) return;
    playlistMenuContainer.innerHTML = ""; // Empty out old items

    activeQueue.forEach((track) => {
        const trackRow = document.createElement("div");
        trackRow.className = "track-item";
        trackRow.setAttribute("data-song-id", track.id); // Hook the ID into the DOM layout
        trackRow.textContent = `${track.title} - ${track.artist}`;

        // Hook directly into the row using event listeners without inline HTML attributes
        trackRow.addEventListener("click", () => {
            loadTrackById(track.id);
            if (playPauseState === 0) togglePlayPause(); // Auto play when selecting from menu
        });

        playlistMenuContainer.appendChild(trackRow);
    });
}

// Visual visual styling update to make the active element look selected
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

// Dynamic JSON fetch handling
async function fetchAndSwitchPlaylist(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`Could not load: ${fileName}`);
        
        activeQueue = await response.json();
        
        // Re-render visual list elements with their fresh IDs
        renderPlaylistMenu();
        
        // Load initial entry of the fresh array container
        loadTrack(0);
        
    } catch (error) {
        console.error("Error swapping playlist files:", error);
    }
}

// Controls logic (Play, Pause, Skipping)
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
    fetchAndSwitchPlaylist("index.json");

    if (playPauseBtn)      playPauseBtn.addEventListener("click", togglePlayPause);
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
