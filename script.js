// Get elements
const playlistSelector = document.getElementById("playlist-select");
const playlistMenu = document.getElementById("playlist-menu");

const albumArt = document.getElementById("album-art");
const songName = document.getElementById("song-name");
const albumName = document.getElementById("album-name");
const albumArtist = document.getElementById("album-artist");

const previousTrackBtn = document.getElementById("previous-track");
const playPauseBtn = document.getElementById("play-pause");
const playPauseIcon = document.getElementById("play-pause-icon");
const nextTrackBtn = document.getElementById("next-track");

const audioElement = document.getElementById("audio");

// Helper variables
let currentIndex = 0;
let playlists = []; // Array for playlists
let playlistIndex = 0;

// Helper functions
function playPause() {
    if (audioElement.paused) {
        audioElement.play()
            .then(() => {
                playPauseIcon.classList.replace("fa-play", "fa-pause");
            })
            .catch(error => console.error("Could not play audio:", error));
    } else {
        audioElement.pause();
        playPauseIcon.classList.replace("fa-pause", "fa-play");
    }
}

async function getAndReadPlaylistIndex() {
    try {
        const response = await fetch("./index.json");

        if (!response.ok) {
            throw new Error(`Error fetching playlist index: ${response.status}`);
        }

        playlists = await response.json();
        playlistSelector.replaceChildren();

        for (const playlist of playlists) {
            const option = document.createElement("option");
            option.value = playlist.file;
            option.textContent = playlist.name;
            playlistSelector.appendChild(option);
        }
    } catch (error) {
        console.error("Could not load playlist index:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    getAndReadPlaylistIndex();
});
