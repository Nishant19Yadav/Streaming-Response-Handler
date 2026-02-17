// State Management
let currentVideos = [];
let user = JSON.parse(localStorage.getItem('user')) || null;
let token = localStorage.getItem('token') || null;

// DOM Elements
const videoGrid = document.getElementById('videoGrid');
const searchInput = document.getElementById('searchInput');
const userProfileArea = document.getElementById('userProfileArea');
const videoModal = document.getElementById('videoModal');
const closeModal = document.getElementById('closeModal');
const mainPlayer = document.getElementById('mainPlayer');
const modalVideoTitle = document.getElementById('modalVideoTitle');
const modalVideoViews = document.getElementById('modalVideoViews');
const likeBtn = document.getElementById('likeBtn');
const sectionLabel = document.getElementById('sectionLabel');
const adminLinkContainer = document.getElementById('admin-link-container');
const continueSection = document.getElementById('continueSection');
const historyGrid = document.getElementById('historyGrid');

// Initialize
async function init() {
    if (token && !user) {
        try {
            const res = await fetch('/api/auth/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data._id) {
                user = { id: data._id, name: data.name, email: data.email, role: data.role };
                localStorage.setItem('user', JSON.stringify(user));
            }
        } catch (e) {
            console.error('Initial profile fetch failed', e);
        }
    }
    await fetchVideos();
    updateUIForAuth();
    if (user) {
        fetchHistory();
    }
}


async function fetchVideos() {
    try {
        const res = await fetch('/api/videos');
        currentVideos = await res.json();
        renderVideos(currentVideos);

        // Setup Hero
        if (currentVideos.length > 0) {
            setupHero(currentVideos[0]);
        }
    } catch (err) {
        console.error('Failed to fetch videos', err);
    }
}

function renderVideos(videos, container = videoGrid) {
    container.innerHTML = videos.map(v => `
        <div class="video-card" onclick="openPlayer('${v._id}')">
            <div class="thumbnail-container">
                <img src="${v.thumbnail || '/placeholder-thumb.jpg'}" alt="${v.title}">
                <span class="duration">${v.duration || '0:00'}</span>
            </div>
            <div class="video-info">
                <div class="video-title">${v.title}</div>
                <div class="video-meta">
                    <span>${v.views} views</span>
                    <span>•</span>
                    <span>${formatDate(v.uploadDate)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function setupHero(video) {
    const hero = document.getElementById('heroBanner');
    hero.style.background = `linear-gradient(to right, rgba(0,0,0,0.8), transparent), url('${video.thumbnail}') center/cover`;
    hero.querySelector('h1').innerText = video.title;
    hero.querySelector('p').innerText = video.description || 'Watch our latest trending video now.';
    document.getElementById('playHeroBtn').onclick = () => openPlayer(video._id);
}

function updateUIForAuth() {
    if (user) {
        userProfileArea.innerHTML = `
            <div style="display:flex; align-items:center; gap: 15px;">
                <span style="font-size: 14px; font-weight: 600;">Hi, ${user.name || user.username}</span>
                <div class="profile-img" onclick="toggleUserDropdown()">
                    <img src="https://ui-avatars.com/api/?name=${user.name || user.username}&background=random" alt="Profile" style="width:100%; border-radius:50%">
                </div>
                <button onclick="logout()" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="fa-solid fa-right-from-bracket"></i></button>
            </div>
        `;
        if (user.role === 'admin') {
            adminLinkContainer.style.display = 'block';
        }
        continueSection.style.display = 'block';
    } else {
        userProfileArea.innerHTML = `<a href="auth.html" class="btn-login">Login / Sign Up</a>`;
        adminLinkContainer.style.display = 'none';
        continueSection.style.display = 'none';
    }
}

async function fetchHistory() {
    if (!token) return;
    try {
        const res = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profile = await res.json();
        if (profile.watchHistory && profile.watchHistory.length > 0) {
            const historyVideos = profile.watchHistory.map(h => h.video).filter(v => v !== null);
            renderVideos(historyVideos.slice(0, 4), historyGrid);
        }
    } catch (err) { console.error('History fetch failed', err); }
}

async function openPlayer(id) {
    const video = currentVideos.find(v => v._id === id);
    if (!video) return;

    modalVideoTitle.innerText = video.title;
    modalVideoViews.innerHTML = `<i class="fa-solid fa-eye"></i> ${video.views + 1} views`;
    mainPlayer.src = `/api/videos/stream/${id}`;
    videoModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Update history in background if logged in
    if (user) {
        fetch('/api/auth/history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ videoId: id })
        });

        // Check if liked
        const res = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profile = await res.json();
        const isLiked = profile.likedVideos.some(v => v._id === id);
        updateLikeBtn(isLiked);

        likeBtn.onclick = () => toggleLike(id);
    } else {
        likeBtn.onclick = () => window.location.href = 'auth.html';
    }
}

async function toggleLike(videoId) {
    try {
        const res = await fetch('/api/auth/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ videoId })
        });
        const data = await res.json();
        updateLikeBtn(data.liked);
    } catch (err) { console.error('Like failed', err); }
}

function updateLikeBtn(isLiked) {
    if (isLiked) {
        likeBtn.innerHTML = `<i class="fa-solid fa-thumbs-up" style="color: var(--primary)"></i> Liked`;
    } else {
        likeBtn.innerHTML = `<i class="fa-regular fa-thumbs-up"></i> Like`;
    }
}

closeModal.onclick = () => {
    videoModal.classList.remove('active');
    mainPlayer.pause();
    mainPlayer.src = '';
    document.body.style.overflow = 'auto';
    fetchVideos(); // Refresh view count
};

// Search Logic
searchInput.addEventListener('input', debounce(async (e) => {
    const q = e.target.value;
    if (q.length < 2) {
        fetchVideos();
        sectionLabel.innerText = "All Videos";
        return;
    }

    try {
        const res = await fetch(`/api/videos/search?q=${q}`);
        const results = await res.json();
        renderVideos(results);
        sectionLabel.innerText = `Results for "${q}"`;
    } catch (err) { console.error(err); }
}, 500));

// Helpers
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function logout() {
    localStorage.clear();
    window.location.reload();
}

async function showHistory() {
    if (!user) { window.location.href = 'auth.html'; return; }
    const res = await fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const profile = await res.json();
    const historyVideos = profile.watchHistory.map(h => h.video).filter(v => v !== null);
    renderVideos(historyVideos);
    sectionLabel.innerText = "Watch History";
}

async function showLiked() {
    if (!user) { window.location.href = 'auth.html'; return; }
    const res = await fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const profile = await res.json();
    renderVideos(profile.likedVideos);
    sectionLabel.innerText = "Liked Videos";
}

function loadCategory(cat) {
    fetchVideos();
    sectionLabel.innerText = cat === 'trending' ? "Trending Now" : "All Videos";
}

init();
