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
const loopToggleBtn = document.getElementById("loop-toggle");
const loopOneIndicator = document.getElementById("loop-one-indicator");
const refreshIndexBtn = document.getElementById("refresh-index");
const refreshPlaylistBtn = document.getElementById("refresh-playlist");
const seekBar = document.getElementById("seek-bar");
const currentTimeLabel = document.getElementById("current-time");
const durationLabel = document.getElementById("duration");

const audioElement = document.getElementById("audio");

// Helper variables
let currentIndex = 0;
let playlists = []; // Array for playlists
let playlistTracks = [];
let playlistIndex = 0;
let loopMode = "off";
let currentTrackObjectUrl = "";

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

function cycleLoopMode() {
    const modes = ["off", "playlist", "track"];
    loopMode = modes[(modes.indexOf(loopMode) + 1) % modes.length];
    audioElement.loop = loopMode === "track";

    const modeLabel = loopMode === "off"
        ? "off"
        : loopMode === "playlist"
            ? "playlist"
            : "current track";
    loopToggleBtn.setAttribute("aria-label", `Loop mode: ${modeLabel}`);
    loopToggleBtn.title = `Loop mode: ${modeLabel}`;
    loopToggleBtn.setAttribute("aria-pressed", String(loopMode !== "off"));
    loopOneIndicator.hidden = loopMode !== "track";
}

function formatTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
        return "0:00";
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function updateSeekBar() {
    const duration = Number.isFinite(audioElement.duration) ? audioElement.duration : 0;
    const currentTime = Number.isFinite(audioElement.currentTime) ? audioElement.currentTime : 0;
    const hasDuration = duration > 0;

    seekBar.disabled = !hasDuration;
    seekBar.value = hasDuration ? (currentTime / duration) * 100 : 0;
    currentTimeLabel.textContent = formatTime(currentTime);
    durationLabel.textContent = formatTime(duration);
}

async function loadAudioSource(track) {
    const playlistFolder = playlistSelector.value.replace(/\.json$/i, "");
    const playlistAssetDirectory = `./playlists/src/${playlistFolder}`;
    const audioUrl = new URL(`${playlistAssetDirectory}/${track.fileName}`, document.baseURI).href;

    if (currentTrackObjectUrl) {
        URL.revokeObjectURL(currentTrackObjectUrl);
        currentTrackObjectUrl = "";
    }

    try {
        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Error fetching track: ${response.status}`);
        }

        const audioBlob = await response.blob();
        currentTrackObjectUrl = URL.createObjectURL(audioBlob);
        audioElement.src = currentTrackObjectUrl;
        audioElement.load();
    } catch (error) {
        console.error("Could not load track source:", error);
        audioElement.removeAttribute("src");
        audioElement.load();
    }
}

async function displayTrack(track) {
    const playlistFolder = playlistSelector.value.replace(/\.json$/i, "");
    const playlistAssetDirectory = `./playlists/src/${playlistFolder}`;
    const artworkFile = track.albumArtFile ?? track.AlbumArtFile;
    const artworkUrl = artworkFile
        ? new URL(`${playlistAssetDirectory}/${artworkFile}`, document.baseURI).href
        : "";

    currentIndex = track.ID;
    songName.textContent = track.title;
    albumName.textContent = track.albumName;
    albumArtist.textContent = track.artistName;
    seekBar.value = 0;
    currentTimeLabel.textContent = "0:00";
    durationLabel.textContent = "0:00";
    if (artworkFile) {
        albumArt.src = artworkUrl;
    } else {
        albumArt.removeAttribute("src");
        console.error("Track is missing albumArtFile:", track);
    }

    await loadAudioSource(track);

    if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artistName,
            album: track.albumName,
            artwork: artworkFile
                ? [{ src: artworkUrl, sizes: "300x300", type: "image/png" }]
                : []
        });
    }
}

async function playTrackAt(position) {
    const track = playlistTracks[position];
    if (!track) {
        return;
    }

    await displayTrack(track);
    audioElement.play()
        .then(() => playPauseIcon.classList.replace("fa-play", "fa-pause"))
        .catch(error => console.error("Could not play track:", error));
}

async function nextTrack() {
    if (playlistTracks.length === 0) {
        return;
    }

    const currentTrackPosition = playlistTracks.findIndex(track => track.ID === currentIndex);
    const nextTrackPosition = currentTrackPosition < 0
        ? 0
        : (currentTrackPosition + 1) % playlistTracks.length;

    await playTrackAt(nextTrackPosition);
}

async function previousTrack() {
    if (playlistTracks.length === 0) {
        return;
    }

    const currentTrackPosition = playlistTracks.findIndex(track => track.ID === currentIndex);
    const previousTrackPosition = currentTrackPosition < 0
        ? playlistTracks.length - 1
        : (currentTrackPosition - 1 + playlistTracks.length) % playlistTracks.length;
    const track = playlistTracks[previousTrackPosition];

    await displayTrack(track);
    audioElement.play()
        .then(() => playPauseIcon.classList.replace("fa-play", "fa-pause"))
        .catch(error => console.error("Could not play previous track:", error));
}

async function getAndReadPlaylistIndex(preserveSelection = false) {
    const selectedFile = preserveSelection ? playlistSelector.value : "";

    try {
        const response = await fetch("./index.json", { cache: "no-store" });

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

        if (playlists.some(playlist => playlist.file === selectedFile)) {
            playlistSelector.value = selectedFile;
        }

        await getAndReadPlaylistFile(preserveSelection);
    } catch (error) {
        console.error("Could not load playlist index:", error);
    }
}

async function getAndReadPlaylistFile(preserveCurrentTrack = false) {
    const selectedFile = playlistSelector.value;

    if (!selectedFile) {
        playlistTracks = [];
        return;
    }

    try {
        const response = await fetch(`./playlists/${selectedFile}`, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`Error fetching playlist file: ${response.status}`);
        }

        const tracks = await response.json();

        if (!Array.isArray(tracks)) {
            throw new Error("Playlist file must contain an array of tracks.");
        }

        playlistTracks = tracks.sort((firstTrack, secondTrack) => firstTrack.ID - secondTrack.ID);
        const selectedTrack = preserveCurrentTrack
            ? playlistTracks.find(track => track.ID === currentIndex) ?? playlistTracks[0]
            : playlistTracks[0];
        currentIndex = selectedTrack?.ID ?? 0;
        playlistIndex = playlists.findIndex(playlist => playlist.file === selectedFile);

        if (selectedTrack) {
            await displayTrack(selectedTrack);
        }
    } catch (error) {
        playlistTracks = [];
        console.error("Could not load playlist file:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    getAndReadPlaylistIndex();
    playlistSelector.addEventListener("change", () => getAndReadPlaylistFile());
    refreshIndexBtn.addEventListener("click", () => getAndReadPlaylistIndex(true));
    refreshPlaylistBtn.addEventListener("click", () => getAndReadPlaylistFile(true));
    previousTrackBtn.addEventListener("click", previousTrack);
    nextTrackBtn.addEventListener("click", nextTrack);
    playPauseBtn.addEventListener("click", playPause);
    loopToggleBtn.addEventListener("click", cycleLoopMode);

    seekBar.addEventListener("input", (event) => {
        const duration = audioElement.duration || 0;
        if (!duration) {
            return;
        }

        const nextTime = (Number(event.target.value) / 100) * duration;
        audioElement.currentTime = nextTime;
        updateSeekBar();
    });

    audioElement.addEventListener("timeupdate", updateSeekBar);
    audioElement.addEventListener("loadedmetadata", updateSeekBar);
    audioElement.addEventListener("ended", () => {
        if (loopMode === "track") {
            audioElement.currentTime = 0;
            audioElement.play()
                .then(() => playPauseIcon.classList.replace("fa-play", "fa-pause"))
                .catch(error => console.error("Could not replay current track:", error));
            return;
        }

        const currentTrackPosition = playlistTracks.findIndex(track => track.ID === currentIndex);
        const nextTrackPosition = currentTrackPosition + 1;

        if (currentTrackPosition >= 0 && nextTrackPosition < playlistTracks.length) {
            playTrackAt(nextTrackPosition);
            return;
        }

        if (loopMode === "playlist" && playlistTracks.length > 0) {
            playTrackAt(0);
            return;
        }

        playPauseIcon.classList.replace("fa-pause", "fa-play");
        if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "paused";
        }
        updateSeekBar();
    });

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
