function getRankInfo(rankGems) {
    if (rankGems >= 5000) { return { emoji: '🏆', title: 'Expert' }; }
    if (rankGems >= 1500) { return { emoji: '🧭', title: 'Ghid' }; }
    if (rankGems >= 500)  { return { emoji: '🗺️', title: 'Explorator' }; }
    if (rankGems >= 100)  { return { emoji: '✈️', title: 'Calator' }; }
    return { emoji: '🌱', title: 'Incepator' };
}
document.addEventListener("DOMContentLoaded", async function() {
    const mapEl = document.getElementById("user-personal-map");
    let profileMap = null;
    if (mapEl && typeof L !== "undefined") {
        profileMap = window.makeMap("user-personal-map", { center: [45.9432, 24.9668], zoom: 7 });
    }
    // daca URL-ul contine ?id=xxx afisez profilul acelui user, altfel al meu
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('id');
    const loggedStr = localStorage.getItem("user");
    const loggedUser = loggedStr ? JSON.parse(loggedStr) : null;
    const isOwnProfile = !viewId || (loggedUser && String(viewId) === String(loggedUser.id));
    const userId = viewId || (loggedUser ? loggedUser.id : null);
    if (!userId) { return; }
    // Ascund butoanele de editare cand e profilul altui user
    if (!isOwnProfile) {
        const toHide = ['.change-cover-btn', '#change-avatar-btn', '.description-edit-btn'];
        for (let th = 0; th < toHide.length; th++) {
            const el = document.querySelector(toHide[th]);
            if (el) { el.style.display = 'none'; }
        }
    }
    // aduc datele userului de la server
    let followersEl = null;
    try {
        const uRes = await fetch("http://localhost:5000/api/auth/user/" + userId);
        if (uRes.ok) {
            const uData = await uRes.json();
            // actualizez localStorage doar pentru profilul propriu
            if (isOwnProfile && loggedUser) {
                const updated = Object.assign({}, loggedUser, {
                    rankGems: uData.rankGems,
                    monthlyGems: uData.monthlyGems,
                    bio: uData.bio,
                    coverPhoto: uData.coverPhoto
                });
                localStorage.setItem("user", JSON.stringify(updated));
                // Actualizez contorul de gems din dropdown (doar pentru profilul propriu)
                const gemsRemainingEl = document.getElementById('gems-remaining');
                const gemsBarFill = document.getElementById('gems-bar-fill');
                if (gemsRemainingEl) { gemsRemainingEl.textContent = uData.monthlyGems; }
                if (gemsBarFill)     { gemsBarFill.style.width = uData.monthlyGems + '%'; }
                // Avatar si username in header
                const headerAvatars = document.querySelectorAll('.profile-trigger .avatar');
                for (let i = 0; i < headerAvatars.length; i++) {
                    if (hasAvatar(uData.avatar)) { headerAvatars[i].src = uData.avatar; headerAvatars[i].classList.remove('av-hidden'); }
                }
                const headerUsernames = document.querySelectorAll('.profile-trigger .username');
                for (let j = 0; j < headerUsernames.length; j++) {
                    headerUsernames[j].textContent = uData.username || loggedUser.username;
                }
            }
            // Actualizez rank badge
            const rankInfo = getRankInfo(uData.rankGems || 0);
            const rankTitleEl = document.getElementById('rank-title');
            const rankGemsEl = document.getElementById('rank-gems-count');
            if (rankTitleEl) { rankTitleEl.textContent = rankInfo.emoji + ' ' + rankInfo.title; }
            if (rankGemsEl) { rankGemsEl.textContent = '💎 ' + (uData.rankGems || 0) + ' RankGems'; }
            // Actualizez informatiile de profil
            const usernameEl = document.getElementById('profile-username');
            if (usernameEl) { usernameEl.textContent = uData.username || ''; }
            const bioEl = document.getElementById('bio-text');
            if (bioEl) { bioEl.textContent = uData.bio || ''; }
            const coverEl = document.getElementById('cover-img');
            if (coverEl && uData.coverPhoto) { coverEl.src = uData.coverPhoto; }
            const avatarEl = document.getElementById('avatar-img');
            if (avatarEl && hasAvatar(uData.avatar)) { avatarEl.src = uData.avatar; avatarEl.classList.remove('av-hidden'); }
            // Actualizez contoarele de followeri/following
            const followingEl = document.getElementById('following-count');
            followersEl = document.getElementById('followers-count');
            if (followingEl) { followingEl.textContent = uData.followingCount || 0; }
            if (followersEl) { followersEl.textContent = uData.followersCount || 0; }
            // Arata butonul de follow pentru profilul altui user
            if (!isOwnProfile && loggedUser) {
                const followBtn = document.getElementById('profile-follow-btn');
                if (followBtn) {
                    followBtn.style.display = 'inline-block';
                    followBtn.addEventListener('click', async function() {
                        try {
                            const fData = await window.sendFollow(userId, loggedUser.id);
                            if (fData) {
                                followBtn.textContent = fData.isFollowing ? 'Urmărești' : 'Urmărire';
                                followBtn.classList.toggle('following', fData.isFollowing);
                                if (followersEl) { followersEl.textContent = fData.followersCount; }
                            }
                        } catch (e) {
                            alert("Serverul nu răspunde.");
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.warn("Nu s-au putut actualiza datele userului:", e);
    }
    // editare coperta profil
    const changeCoverBtn = document.querySelector('.change-cover-btn');
    const coverInput = document.getElementById('cover-input');
    if (changeCoverBtn && coverInput) {
        changeCoverBtn.addEventListener('click', function() {
            coverInput.click();
        });
        coverInput.addEventListener('change', async function() {
            const file = this.files[0];
            if (!file) { return; }
            const reader = new FileReader();
            reader.onload = async function(ev) {
                const base64 = ev.target.result;
                try {
                    const res = await fetch("http://localhost:5000/api/auth/user/" + userId + "/cover", {
                        method:  'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ coverPhoto: base64 })
                    });
                    if (res.ok) {
                        const coverEl2 = document.getElementById('cover-img');
                        if (coverEl2) { coverEl2.src = base64; }
                    }
                } catch (e) {
                    alert("Eroare la actualizarea copertei.");
                }
            };
            reader.readAsDataURL(file);
        });
    }
    // editare avatar
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const avatarInput = document.getElementById('avatar-input');
    if (changeAvatarBtn && avatarInput) {
        changeAvatarBtn.addEventListener('click', function() {
            avatarInput.click();
        });
        avatarInput.addEventListener('change', async function() {
            const file = this.files[0];
            if (!file) { return; }
            const reader = new FileReader();
            reader.onload = async function(ev) {
                const base64 = ev.target.result;
                try {
                    const res = await fetch("http://localhost:5000/api/auth/user/" + userId + "/avatar", {
                        method:  'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ avatar: base64 })
                    });
                    if (res.ok) {
                        // Actualizez avatarul pe pagina si in localStorage
                        const avatarEl2 = document.getElementById('avatar-img');
                        if (avatarEl2) { avatarEl2.src = base64; }

                        const headerAvatars2 = document.querySelectorAll('.profile-trigger .avatar');
                        for (let k = 0; k < headerAvatars2.length; k++) {
                            headerAvatars2[k].src = base64;
                            headerAvatars2[k].classList.remove('av-hidden');
                        }

                        const u = JSON.parse(localStorage.getItem("user") || '{}');
                        u.avatar = base64;
                        localStorage.setItem("user", JSON.stringify(u));
                    }
                } catch (e) {
                    alert("Eroare la actualizarea pozei de profil.");
                }
            };
            reader.readAsDataURL(file);
        });
    }
    // editare bio
    const bioText = document.getElementById('bio-text');
    const bioInput = document.getElementById('bio-input');
    const bioEditActions = document.getElementById('bio-edit-actions');
    const bioSaveBtn = document.getElementById('bio-save-btn');
    const bioCancelBtn = document.getElementById('bio-cancel-btn');
    const descEditBtn = document.querySelector('.description-edit-btn');
    // Cand userul apasa "Editeaza descrierea" - ascund textul si arat textarea
    if (descEditBtn) {
        descEditBtn.addEventListener('click', function() {
            if (bioText)        { bioText.style.display = 'none'; }
            if (bioInput) {
                bioInput.style.display = 'block';
                bioInput.value = bioText ? bioText.textContent : '';
                bioInput.focus();
            }
            if (bioEditActions) { bioEditActions.style.display = 'flex'; }
            this.style.display = 'none';
        });
    }
    // Buton Anuleaza - revin la afisarea textului original
    if (bioCancelBtn) {
        bioCancelBtn.addEventListener('click', function() {
            if (bioText)        { bioText.style.display = ''; }
            if (bioInput)       { bioInput.style.display = 'none'; }
            if (bioEditActions) { bioEditActions.style.display = 'none'; }
            if (descEditBtn)    { descEditBtn.style.display = ''; }
        });
    }
    // Buton Salveaza - trimit bio-ul la server
    if (bioSaveBtn) {
        bioSaveBtn.addEventListener('click', async function() {
            const newBio = bioInput ? bioInput.value.trim() : '';
            try {
                const res = await fetch("http://localhost:5000/api/auth/user/" + userId, {
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ bio: newBio })
                });
                if (res.ok) {
                    if (bioText) { bioText.textContent = newBio; bioText.style.display = ''; }
                    if (bioInput) { bioInput.style.display = 'none'; }
                    if (bioEditActions) { bioEditActions.style.display = 'none'; }
                    if (descEditBtn) { descEditBtn.style.display = ''; }
                    // Actualizez si in localStorage
                    const u2 = JSON.parse(localStorage.getItem("user") || '{}');
                    u2.bio = newBio;
                    localStorage.setItem("user", JSON.stringify(u2));
                }
            } catch (e) {
                alert("Eroare la salvarea descrierii.");
            }
        });
    }
    // aduc postarile userului
    let posts = [];
    try {
        const postsRes = await fetch("http://localhost:5000/api/posts/user/" + userId);
        if (!postsRes.ok) { return; }
        posts = await postsRes.json();
    } catch (err) {
        console.error("Eroare la incarcarea postarilor:", err);
        return;
    }
    window.postsArray = posts;
    // construiesc grila de postari
    const grid = document.querySelector('.profile-grid');
    const gridTpl = document.getElementById('grid-item-template');
    if (grid) {
        grid.replaceChildren();
        if (posts.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'color:#aaa;text-align:center;padding:40px;grid-column:1/-1;';
            empty.textContent = 'Nu ai postari inca.';
            grid.appendChild(empty);
        } else {
            for (let p = 0; p < posts.length; p++) {
                const post = posts[p];
                const firstImg = (post.route && post.route.length > 0 && post.route[0].img)
                    ? post.route[0].img
                    : 'https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
                const node = gridTpl.content.cloneNode(true);
                const item = node.querySelector('.grid-item');
                item.dataset.postId = post._id;
                const img = item.querySelector('img');
                img.src = firstImg;
                img.alt = post.title;
                img.addEventListener('click', function() {
                    if (window.populateAndOpenModal) { window.populateAndOpenModal(post._id); }
                });
                if (isOwnProfile) {
                    const delBtn = document.createElement('button');
                    delBtn.className = 'delete-post-btn';
                    delBtn.title = 'Sterge postarea';
                    delBtn.textContent = '✕';
                    delBtn.addEventListener('click', async function(e) {
                        e.stopPropagation();
                        if (!confirm('Esti sigur ca vrei sa stergi aceasta postare?')) { return; }
                        try {
                            const delRes = await fetch("http://localhost:5000/api/posts/" + post._id, {
                                method:  'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body:    JSON.stringify({ userId: loggedUser.id })
                            });
                            if (delRes.ok) {
                                item.remove();
                                window.postsArray = window.postsArray.filter(function(pr) {
                                    return pr._id !== post._id;
                                });
                                // Sterg si marker-ul de pe harta daca exista
                                if (profileMap) {
                                    profileMap.eachLayer(function(l) {
                                        if (l._postId === post._id) { profileMap.removeLayer(l); }
                                    });
                                }
                            } else {
                                alert("Nu s-a putut sterge postarea.");
                            }
                        } catch (e) {
                            alert("Serverul nu raspunde.");
                        }
                    });
                    item.appendChild(delBtn);
                }
                grid.appendChild(item);
            }
        }
    }
    // adaug markeri pe harta pentru fiecare postare
    if (profileMap && posts.length > 0) {
        const bounds = [];
        for (let m = 0; m < posts.length; m++) {
            const postItem = posts[m];
            if (postItem.route && postItem.route.length > 0) {
                const wp = postItem.route[0];
                const marker = L.marker([wp.lat, wp.lng]).addTo(profileMap);
                marker._postId = postItem._id;

                const pop = document.createElement('div');
                const strong = document.createElement('b');
                strong.textContent = postItem.title;
                pop.appendChild(strong);
                pop.appendChild(document.createElement('br'));
                pop.appendChild(document.createTextNode(postItem.difficulty + ' • ' + postItem.totalDistance));
                marker.bindPopup(pop);

                // La click pe marker deschid modalul postarii
                (function(pid) {
                    marker.on('click', function() {
                        if (window.populateAndOpenModal) { window.populateAndOpenModal(pid); }
                    });
                })(postItem._id);

                bounds.push([wp.lat, wp.lng]);
            }
        }
        if (bounds.length > 0) {
            profileMap.fitBounds(bounds, { padding: [40, 40] });
        }
        // Fix Leaflet - recalculez dimensiunile dupa ce harta devine vizibila
        setTimeout(function() { profileMap.invalidateSize(); }, 300);
    }
    // notificarile se incarca intotdeauna pentru userul logat, nu cel vizualizat
    if (loggedUser && loggedUser.id && window.loadNotifDropdown) {
        window.loadNotifDropdown(loggedUser.id);
    }
});
