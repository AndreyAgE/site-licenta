function getRankInfo(rankGems) {
    if (rankGems >= 5000) { return { emoji: '🏆', title: 'Expert' }; }
    if (rankGems >= 1500) { return { emoji: '🧭', title: 'Ghid' }; }
    if (rankGems >= 500)  { return { emoji: '🗺️', title: 'Explorator' }; }
    if (rankGems >= 100)  { return { emoji: '✈️', title: 'Calator' }; }
    return { emoji: '🌱', title: 'Incepator' };
}
document.addEventListener("DOMContentLoaded", async function() {
    var mapEl = document.getElementById("user-personal-map");
    var profileMap = null;
    if (mapEl && typeof L !== "undefined") {
        profileMap = L.map("user-personal-map").setView([45.9432, 24.9668], 7);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(profileMap);
    }
    // daca URL-ul contine ?id=xxx afisez profilul acelui user, altfel al meu
    var urlParams = new URLSearchParams(window.location.search);
    var viewId = urlParams.get('id');
    var loggedStr = localStorage.getItem("user");
    var loggedUser = loggedStr ? JSON.parse(loggedStr) : null;
    var isOwnProfile = !viewId || (loggedUser && String(viewId) === String(loggedUser.id));
    var userId = viewId || (loggedUser ? loggedUser.id : null);
    if (!userId) { return; }
    // Ascund butoanele de editare cand e profilul altui user
    if (!isOwnProfile) {
        var toHide = ['.change-cover-btn', '#change-avatar-btn', '.description-edit-btn'];
        for (var th = 0; th < toHide.length; th++) {
            var el = document.querySelector(toHide[th]);
            if (el) { el.style.display = 'none'; }
        }
    }
    // aduc datele userului de la server
    try {
        var uRes = await fetch("http://localhost:5000/api/auth/user/" + userId);
        if (uRes.ok) {
            var uData = await uRes.json();
            // actualizez localStorage doar pentru profilul propriu
            if (isOwnProfile && loggedUser) {
                var updated = Object.assign({}, loggedUser, {
                    rankGems: uData.rankGems,
                    monthlyGems: uData.monthlyGems,
                    bio: uData.bio,
                    coverPhoto: uData.coverPhoto
                });
                localStorage.setItem("user", JSON.stringify(updated));
                // Actualizez contorul de gems din dropdown (doar pentru profilul propriu)
                var gemsRemainingEl = document.getElementById('gems-remaining');
                var gemsBarFill = document.getElementById('gems-bar-fill');
                if (gemsRemainingEl) { gemsRemainingEl.textContent = uData.monthlyGems; }
                if (gemsBarFill)     { gemsBarFill.style.width = uData.monthlyGems + '%'; }
                // Avatar si username in header
                var headerAvatars = document.querySelectorAll('.profile-trigger .avatar');
                for (var i = 0; i < headerAvatars.length; i++) {
                    if (hasAvatar(uData.avatar)) { headerAvatars[i].src = uData.avatar; headerAvatars[i].classList.remove('av-hidden'); }
                }
                var headerUsernames = document.querySelectorAll('.profile-trigger .username');
                for (var j = 0; j < headerUsernames.length; j++) {
                    headerUsernames[j].textContent = uData.username || loggedUser.username;
                }
            }
            // Actualizez rank badge
            var rankInfo = getRankInfo(uData.rankGems || 0);
            var rankTitleEl = document.getElementById('rank-title');
            var rankGemsEl = document.getElementById('rank-gems-count');
            if (rankTitleEl) { rankTitleEl.textContent = rankInfo.emoji + ' ' + rankInfo.title; }
            if (rankGemsEl) { rankGemsEl.textContent = '💎 ' + (uData.rankGems || 0) + ' RankGems'; }
            // Actualizez informatiile de profil
            var usernameEl = document.getElementById('profile-username');
            if (usernameEl) { usernameEl.textContent = uData.username || ''; }
            var bioEl = document.getElementById('bio-text');
            if (bioEl) { bioEl.textContent = uData.bio || ''; }
            var coverEl = document.getElementById('cover-img');
            if (coverEl && uData.coverPhoto) { coverEl.src = uData.coverPhoto; }
            var avatarEl = document.getElementById('avatar-img');
            if (avatarEl && hasAvatar(uData.avatar)) { avatarEl.src = uData.avatar; avatarEl.classList.remove('av-hidden'); }
            // Actualizez contoarele de followeri/following
            var followingEl = document.getElementById('following-count');
            var followersEl = document.getElementById('followers-count');
            if (followingEl) { followingEl.textContent = uData.followingCount || 0; }
            if (followersEl) { followersEl.textContent = uData.followersCount || 0; }
            // Arata butonul de follow pentru profilul altui user
            if (!isOwnProfile && loggedUser) {
                var followBtn = document.getElementById('profile-follow-btn');
                if (followBtn) {
                    followBtn.style.display = 'inline-block';
                    followBtn.addEventListener('click', async function() {
                        try {
                            var fRes = await fetch("http://localhost:5000/api/auth/user/" + userId + "/follow", {
                                method:  'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body:    JSON.stringify({ followerId: loggedUser.id })
                            });
                            if (fRes.ok) {
                                var fData = await fRes.json();
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
    var changeCoverBtn = document.querySelector('.change-cover-btn');
    var coverInput = document.getElementById('cover-input');
    if (changeCoverBtn && coverInput) {
        changeCoverBtn.addEventListener('click', function() {
            coverInput.click();
        });
        coverInput.addEventListener('change', async function() {
            var file = this.files[0];
            if (!file) { return; }
            var reader = new FileReader();
            reader.onload = async function(ev) {
                var base64 = ev.target.result;
                try {
                    var res = await fetch("http://localhost:5000/api/auth/user/" + userId + "/cover", {
                        method:  'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ coverPhoto: base64 })
                    });
                    if (res.ok) {
                        var coverEl2 = document.getElementById('cover-img');
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
    var changeAvatarBtn = document.getElementById('change-avatar-btn');
    var avatarInput = document.getElementById('avatar-input');
    if (changeAvatarBtn && avatarInput) {
        changeAvatarBtn.addEventListener('click', function() {
            avatarInput.click();
        });
        avatarInput.addEventListener('change', async function() {
            var file = this.files[0];
            if (!file) { return; }
            var reader = new FileReader();
            reader.onload = async function(ev) {
                var base64 = ev.target.result;
                try {
                    var res = await fetch("http://localhost:5000/api/auth/user/" + userId + "/avatar", {
                        method:  'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ avatar: base64 })
                    });
                    if (res.ok) {
                        // Actualizez avatarul pe pagina si in localStorage
                        var avatarEl2 = document.getElementById('avatar-img');
                        if (avatarEl2) { avatarEl2.src = base64; }

                        var headerAvatars2 = document.querySelectorAll('.profile-trigger .avatar');
                        for (var k = 0; k < headerAvatars2.length; k++) {
                            headerAvatars2[k].src = base64;
                            headerAvatars2[k].classList.remove('av-hidden');
                        }

                        var u = JSON.parse(localStorage.getItem("user") || '{}');
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
    var bioText = document.getElementById('bio-text');
    var bioInput = document.getElementById('bio-input');
    var bioEditActions = document.getElementById('bio-edit-actions');
    var bioSaveBtn = document.getElementById('bio-save-btn');
    var bioCancelBtn = document.getElementById('bio-cancel-btn');
    var descEditBtn = document.querySelector('.description-edit-btn');
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
            var newBio = bioInput ? bioInput.value.trim() : '';
            try {
                var res = await fetch("http://localhost:5000/api/auth/user/" + userId, {
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
                    var u2 = JSON.parse(localStorage.getItem("user") || '{}');
                    u2.bio = newBio;
                    localStorage.setItem("user", JSON.stringify(u2));
                }
            } catch (e) {
                alert("Eroare la salvarea descrierii.");
            }
        });
    }
    // aduc postarile userului
    var posts = [];
    try {
        var postsRes = await fetch("http://localhost:5000/api/posts/user/" + userId);
        if (!postsRes.ok) { return; }
        posts = await postsRes.json();
        console.log("postari user:", posts.length);
    } catch (err) {
        console.error("Eroare la incarcarea postarilor:", err);
        return;
    }
    window.postsArray = posts;
    // construiesc grila de postari
    var grid = document.querySelector('.profile-grid');
    if (grid) {
        grid.innerHTML = '';
        if (posts.length === 0) {
            grid.innerHTML = '<p style="color:#aaa;text-align:center;padding:40px;grid-column:1/-1;">Nu ai postari inca.</p>';
        } else {
            for (var p = 0; p < posts.length; p++) {
                var post = posts[p];
                var firstImg = (post.route && post.route.length > 0 && post.route[0].img)
                    ? post.route[0].img
                    : 'https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
                var item = document.createElement('div');
                item.className = 'grid-item';
                item.setAttribute('data-post-id', post._id);
                item.innerHTML = '<img src="' + firstImg + '" alt="' + post.title + '">' +
                    (isOwnProfile ? '<button class="delete-post-btn" data-post-id="' + post._id + '" title="Sterge postarea">&#10005;</button>' : '');
                // Deschidere modal la click pe imagine
                (function(postRef) {
                    item.querySelector('img').addEventListener('click', function() {
                        if (window.populateAndOpenModal) {
                            window.populateAndOpenModal(postRef._id);
                        }
                    });
                    // Buton de stergere postare (doar pe profilul propriu)
                    var delBtn = item.querySelector('.delete-post-btn');
                    if (delBtn) { delBtn.addEventListener('click', async function(e) {
                        e.stopPropagation();
                        if (!confirm('Esti sigur ca vrei sa stergi aceasta postare?')) { return; }
                        var postId = this.getAttribute('data-post-id');
                        try {
                            var delRes = await fetch("http://localhost:5000/api/posts/" + postId, {
                                method:  'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body:    JSON.stringify({ userId: loggedUser.id })
                            });
                            if (delRes.ok) {
                                item.remove();
                                window.postsArray = window.postsArray.filter(function(pr) {
                                    return pr._id !== postId;
                                });
                                // Sterg si marker-ul de pe harta daca exista
                                if (profileMap) {
                                    profileMap.eachLayer(function(l) {
                                        if (l._postId === postId) { profileMap.removeLayer(l); }
                                    });
                                }
                            } else {
                                alert("Nu s-a putut sterge postarea.");
                            }
                        } catch (e) {
                            alert("Serverul nu raspunde.");
                        }
                    }); }
                })(post);

                grid.appendChild(item);
            }
        }
    }
    // adaug markeri pe harta pentru fiecare postare
    if (profileMap && posts.length > 0) {
        var bounds = [];
        for (var m = 0; m < posts.length; m++) {
            var postItem = posts[m];
            if (postItem.route && postItem.route.length > 0) {
                var wp = postItem.route[0];
                var marker = L.marker([wp.lat, wp.lng]).addTo(profileMap);
                marker._postId = postItem._id;
                marker.bindPopup('<b>' + postItem.title + '</b><br>' + postItem.difficulty + ' • ' + postItem.totalDistance);
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
    if (loggedUser && loggedUser.id) {
        loadNotifications(loggedUser.id);
    }
});
// Incarc notificarile necitite si le afisez in dropdown
async function loadNotifications(userId) {
    try {
        var res = await fetch("http://localhost:5000/api/notifications/" + userId);
        if (!res.ok) { return; }
        var notifs = await res.json();
        updateNotifBadge(notifs.length);
        renderNotifDropdown(notifs, userId);
    } catch (e) {}
}
// Actualizez numarul afisat pe clopot
function updateNotifBadge(count) {
    var badge = document.querySelector('#btn-notifications .badge');
    if (badge) {
        badge.textContent = count > 0 ? count : '';
    }
}
// Construiesc textul unei notificari in functie de tip
function notifMessage(n) {
    var name = n.sender ? n.sender.username : 'Cineva';
    if (n.type === 'like'){ return '<strong>' + name + '</strong> a dat like la postarea ta.'; }
    if (n.type === 'gem'){ return '<strong>' + name + '</strong> ti-a oferit 💎 gems.'; }
    if (n.type === 'follow'){ return '<strong>' + name + '</strong> a inceput sa te urmareasca.'; }
    if (n.type === 'comment'){ return '<strong>' + name + '</strong> a comentat la postarea ta.'; }
    return 'Notificare noua.';
}
// Construiesc continutul dropdown-ului de notificari
function renderNotifDropdown(notifs, userId) {
    var menu = document.getElementById('dropdown-notifications');
    if (!menu) { return; }
    var header = menu.querySelector('h4');
    menu.innerHTML = '';
    if (header) { menu.appendChild(header); }
    if (notifs.length === 0) {
        menu.insertAdjacentHTML('beforeend', '<p style="color:#aaa;text-align:center;padding:15px;font-size:0.85rem;">Nicio notificare noua.</p>');
        return;
    }
    for (var i = 0; i < notifs.length; i++) {
        var n = notifs[i];
        var avatar = (n.sender && n.sender.avatar) ? n.sender.avatar : '';
        var div = document.createElement('div');
        div.className = 'notif-item notif-new';
        div.innerHTML = avHTML(avatar, 'avatar-micro') + '<span>' + notifMessage(n) + '</span>';
        if (window.attachNotifClick) { window.attachNotifClick(div, n); }
        menu.appendChild(div);
    }
    // Marchez toate ca citite dupa ce userul deschide dropdown-ul
    var notifBtn = document.getElementById('btn-notifications');
    if (notifBtn) {
        notifBtn.addEventListener('click', async function onOpen() {
            await fetch("http://localhost:5000/api/notifications/read-all/" + userId, { method: 'PUT' });
            updateNotifBadge(0);
        }, { once: true });
    }
}