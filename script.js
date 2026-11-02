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
let playlistTracks = [];
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

function displayTrack(track) {
    const playlistFolder = playlistSelector.value.replace(/\.json$/i, "");
    const playlistAssetDirectory = `./playlists/src/${playlistFolder}`;

    currentIndex = track.ID;
    songName.textContent = track.title;
    albumName.textContent = track.albumName;
    albumArtist.textContent = track.artistName;
    albumArt.src = `${playlistAssetDirectory}/${track.albumArtFile}`;
    audioElement.src = `${playlistAssetDirectory}/${track.fileName}`;

    if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artistName,
            album: track.albumName,
            artwork: [{ src: albumArt.src, sizes: "512x512", type: "image/png" }]
        });
    }
}

function nextTrack() {
    if (playlistTracks.length === 0) {
        return;
    }

    const currentTrackPosition = playlistTracks.findIndex(track => track.ID === currentIndex);
    const nextTrackPosition = (currentTrackPosition + 1) % playlistTracks.length;
    const track = playlistTracks[nextTrackPosition];

    displayTrack(track);
    audioElement.play()
        .then(() => playPauseIcon.classList.replace("fa-play", "fa-pause"))
        .catch(error => console.error("Could not play next track:", error));
}

function previousTrack() {
    if (playlistTracks.length === 0) {
        return;
    }

    const currentTrackPosition = playlistTracks.findIndex(track => track.ID === currentIndex);
    const previousTrackPosition = currentTrackPosition < 0
        ? playlistTracks.length - 1
        : (currentTrackPosition - 1 + playlistTracks.length) % playlistTracks.length;
    const track = playlistTracks[previousTrackPosition];

    displayTrack(track);
    audioElement.play()
        .then(() => playPauseIcon.classList.replace("fa-play", "fa-pause"))
        .catch(error => console.error("Could not play previous track:", error));
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

        await getAndReadPlaylistFile();
    } catch (error) {
        console.error("Could not load playlist index:", error);
    }
}

async function getAndReadPlaylistFile() {
    const selectedFile = playlistSelector.value;

    if (!selectedFile) {
        playlistTracks = [];
        return;
    }

    try {
        const response = await fetch(`./playlists/${selectedFile}`);

        if (!response.ok) {
            throw new Error(`Error fetching playlist file: ${response.status}`);
        }

        const tracks = await response.json();

        if (!Array.isArray(tracks)) {
            throw new Error("Playlist file must contain an array of tracks.");
        }

        playlistTracks = tracks.sort((firstTrack, secondTrack) => firstTrack.ID - secondTrack.ID);
        currentIndex = playlistTracks[0]?.ID ?? 0;
        playlistIndex = playlists.findIndex(playlist => playlist.file === selectedFile);

        if (playlistTracks.length > 0) {
            displayTrack(playlistTracks[0]);
        }
    } catch (error) {
        playlistTracks = [];
        console.error("Could not load playlist file:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    getAndReadPlaylistIndex();
    playlistSelector.addEventListener("change", getAndReadPlaylistFile);
    previousTrackBtn.addEventListener("click", previousTrack);
    nextTrackBtn.addEventListener("click", nextTrack);
    playPauseBtn.addEventListener("click", playPause);

    if ("mediaSession" in navigator) {
        const mediaActions = {
            play: () => {
                if (audioElement.paused) {
                    playPause();
                }
            },
            pause: () => {
                if (!audioElement.paused) {
                    playPause();
                }
            },
            previoustrack: previousTrack,
            nexttrack: nextTrack
        };

        for (const [action, handler] of Object.entries(mediaActions)) {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (error) {
                console.warn(`Media Session action '${action}' is not supported.`, error);
            }
        }

        audioElement.addEventListener("play", () => {
            navigator.mediaSession.playbackState = "playing";
        });
        audioElement.addEventListener("pause", () => {
            navigator.mediaSession.playbackState = "paused";
        });
    }
});
