function hasAvatar(url) {
    return url && url.indexOf('pravatar.cc') === -1;
}
// avatar ca element DOM (nu string html) - il refolosesc in orice lista dinamica

function avatarBit(url, cls) {
    const wrap = document.createElement('div');
    wrap.className = 'av-wrap' + (cls === 'avatar-micro' ? ' av-xs' : cls === 'avatar-small' ? ' av-sm' : '');
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-user';
    wrap.appendChild(icon);
    const realUrl = hasAvatar(url) ? url : '';
    if (realUrl) {
        const img = document.createElement('img');
        img.className = cls || 'avatar';
        img.src = realUrl;
        img.alt = 'Avatar';
        wrap.appendChild(img);
    }
    return wrap;
}
window.avatarBit = avatarBit;
// textul unei notificari dupa tip - il foloseau feed.js si profil.js, fiecare cu copia lui
function notifText(n) {
    const name = n.sender ? n.sender.username : 'Cineva';
    if (n.type === 'like') { return name + ' a dat like la postarea ta.'; }
    if (n.type === 'gem') { return name + ' ti-a oferit 💎 gems.'; }
    if (n.type === 'follow') { return name + ' a inceput sa te urmareasca.'; }
    if (n.type === 'comment') { return name + ' a comentat la postarea ta.'; }
    return 'Notificare noua.';
}
window.notifText = notifText;
// un rand din dropdown-ul de notificari, dintr-un template ca sa nu mai fie innerHTML
function renderNotifRow(n) {
    const tpl = document.getElementById('notif-template');
    if (!tpl) { return null; }
    const node = tpl.content.cloneNode(true);
    const item = node.querySelector('.notif-item');
    const img = item.querySelector('.avatar-micro');
    const url = n.sender ? n.sender.avatar : '';
    if (hasAvatar(url)) { img.src = url; img.classList.remove('av-hidden'); }
    item.querySelector('.notif-text').textContent = notifText(n);
    if (window.attachNotifClick) { window.attachNotifClick(item, n); }
    return item;
}
window.renderNotifRow = renderNotifRow;
function setNotifBadge(count) {
    const badge = document.querySelector('#btn-notifications .badge');
    if (badge) { badge.textContent = count > 0 ? count : ''; }
}
window.setNotifBadge = setNotifBadge;
// incarca si populeaza dropdown-ul de notificari - facea asta si index-ul si profilul, fiecare cu logica lui
async function loadNotifDropdown(userId) {
    const menu = document.getElementById('dropdown-notifications');
    try {
        const res = await fetch('http://localhost:5000/api/notifications/' + userId);
        if (!res.ok) { return; }
        const list = await res.json();
        setNotifBadge(list.length);
        if (!menu) { return; }
        const head = menu.querySelector('h4');
        menu.replaceChildren();
        if (head) { menu.appendChild(head); }
        if (list.length === 0) {
            const p = document.createElement('p');
            p.style.cssText = 'color:#aaa;text-align:center;padding:15px;font-size:0.85rem;';
            p.textContent = 'Nicio notificare noua.';
            menu.appendChild(p);
        } else {
            for (let i = 0; i < list.length; i++) {
                const row = renderNotifRow(list[i]);
                if (row) { menu.appendChild(row); }
            }
        }
        const btn = document.getElementById('btn-notifications');
        if (btn) {
            btn.addEventListener('click', async function() {
                await fetch('http://localhost:5000/api/notifications/read-all/' + userId, { method: 'PUT' });
                setTimeout(function() { setNotifBadge(0); }, 500);
            }, { once: true });
        }
    } catch (e) {}
}
window.loadNotifDropdown = loadNotifDropdown;
// follow/unfollow - acelasi apel era duplicat in modalul de postare si in pagina de profil
async function sendFollow(targetId, myId) {
    const res = await fetch('http://localhost:5000/api/auth/user/' + targetId + '/follow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: myId })
    });
    if (!res.ok) { return null; }
    return res.json();
}
window.sendFollow = sendFollow;
// harta de baza cu tile-ul OSM - o reinitializau la fel map.js, feed.js, profil.js si ui.js
function makeMap(containerId, opts) {
    const map = L.map(containerId);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    if (opts && opts.center) { map.setView(opts.center, opts.zoom || 7); }
    return map;
}
window.makeMap = makeMap;
// un mesaj simplu de status (goale, erori) fara innerHTML
function statusMsg(box, text) {
    const p = document.createElement('p');
    p.className = 'map-empty-line';
    p.textContent = text;
    box.appendChild(p);
    return p;
}
document.addEventListener("DOMContentLoaded", function() {
    // Initializez avatar si username din header cu datele din localStorage
    const _initUser = localStorage.getItem("user");
    if (_initUser) {
        const _u = JSON.parse(_initUser);
        const _avatars   = document.querySelectorAll('.profile-trigger .avatar');
        const _usernames = document.querySelectorAll('.profile-trigger .username');
        for (let _i = 0; _i < _avatars.length;   _i++) { if (hasAvatar(_u.avatar)) { _avatars[_i].src = _u.avatar; _avatars[_i].classList.remove('av-hidden'); } }
        for (let _j = 0; _j < _usernames.length; _j++) { if (_u.username) { _usernames[_j].textContent = _u.username; } }
    }
    // Iau referinte la butoanele si dropdown-urile din header
    const btnNotifications = document.getElementById("btn-notifications");
    const dropdownNotifications = document.getElementById("dropdown-notifications");
    const btnProfile = document.getElementById("btn-profile");
    const dropdownProfile = document.getElementById("dropdown-profile");
    // Functii globale pt deschis/inchis modaluri - le apeleaza si alte fisiere js
    window.openModal = function(modalEl) {
        if (modalEl) {
            modalEl.hidden = false;
            modalEl.classList.remove("hidden");
        }
    };
    window.closeModal = function(modalEl) {
        if (modalEl) {
            modalEl.hidden = true;
            modalEl.classList.add("hidden");
        }
    };
    // Inchidere modal prin butonul cu atributul data-close
    document.addEventListener("click", function(e) {
        const closeBtn = e.target.closest("[data-close]");
        if (closeBtn) {
            e.preventDefault();
            const modalId = closeBtn.getAttribute("data-close");
            window.closeModal(document.getElementById(modalId));
        }
    });
    // Dropdown notificari - toggle la click pe clopot
    if (btnNotifications && dropdownNotifications) {
        btnNotifications.addEventListener("click", function(e) {
            e.stopPropagation(); // important! altfel documentul il inchide imediat
            dropdownNotifications.classList.toggle("hidden");
            // Inchid profilul daca era deschis
            if (dropdownProfile) {
                dropdownProfile.classList.add("hidden");
            }
        });
    }
    // Dropdown profil - toggle la click pe avatar
    if (btnProfile && dropdownProfile) {
        btnProfile.addEventListener("click", function(e) {
            e.stopPropagation();
            dropdownProfile.classList.toggle("hidden");
            // Inchid notificarile daca erau deschise
            if (dropdownNotifications) {
                dropdownNotifications.classList.add("hidden");
            }
        });
    }
    // Buton deconectare - sterge sesiunea si redirectioneaza la login
    const logoutLink = document.querySelector('.dropdown-link.logout');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
        });
    }
    // Inchid dropdown-urile daca userul da click in alta parte a paginii
    document.addEventListener("click", function(e) {
        if (dropdownNotifications && !dropdownNotifications.contains(e.target) && !btnNotifications.contains(e.target)) {
            dropdownNotifications.classList.add("hidden");
        }
        if (dropdownProfile && !dropdownProfile.contains(e.target) && !btnProfile.contains(e.target)) {
            dropdownProfile.classList.add("hidden");
        }
    });
    // bara de cautare
    const searchInput = document.querySelector('.search-bar input');
    let searchDropdown = null;
    let searchTimeout  = null;
    function getOrCreateDropdown() {
        if (searchDropdown) { return searchDropdown; }
        searchDropdown = document.createElement('div');
        searchDropdown.className = 'search-dropdown hidden';
        const bar = document.querySelector('.search-bar');
        if (bar) { bar.appendChild(searchDropdown); }
        return searchDropdown;
    }
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const q = this.value.trim();
            clearTimeout(searchTimeout);
            if (q.length < 2) {
                const dd = getOrCreateDropdown();
                dd.classList.add('hidden');
                dd.replaceChildren();
                return;
            }
            searchTimeout = setTimeout(function() { doSearch(q); }, 300);
        });
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const dd = getOrCreateDropdown();
                dd.classList.add('hidden');
                searchInput.value = '';
            }
        });
        document.addEventListener('click', function(e) {
            if (searchDropdown && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.add('hidden');
            }
        });
    }
    function searchSectionTitle(text) {
        const div = document.createElement('div');
        div.className = 'search-section-title';
        div.textContent = text;
        return div;
    }
    async function doSearch(q) {
        const dd = getOrCreateDropdown();
        dd.replaceChildren();
        statusMsg(dd, 'Se cauta...').className = 'search-loading';
        dd.classList.remove('hidden');
        try {
            const res   = await fetch('http://localhost:5000/api/auth/search?q=' + encodeURIComponent(q));
            const data  = await res.json();
            const users = data.users || [];
            // Cauta titluri de trasee in array-ul global deja incarcat
            const posts = [];
            if (window.postsArray && window.postsArray.length > 0) {
                const ql = q.toLowerCase();
                for (let i = 0; i < window.postsArray.length; i++) {
                    const post = window.postsArray[i];
                    if (post.title && post.title.toLowerCase().indexOf(ql) !== -1) {
                        posts.push(post);
                        if (posts.length >= 5) { break; }
                    }
                }
            }
            dd.replaceChildren();
            if (users.length === 0 && posts.length === 0) {
                statusMsg(dd, 'Niciun rezultat găsit.').className = 'search-empty';
                return;
            }
            if (users.length > 0) {
                dd.appendChild(searchSectionTitle('Persoane'));
                for (let ui = 0; ui < users.length; ui++) {
                    const u = users[ui];
                    const item = document.createElement('div');
                    item.className = 'search-item search-user';
                    item.appendChild(avatarBit(u.avatar || '', 'avatar-micro'));
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = u.username;
                    item.appendChild(nameSpan);
                    (function(uid) {
                        item.addEventListener('click', function() {
                            window.location.href = 'profil.html?id=' + uid;
                            dd.classList.add('hidden');
                            if (searchInput) { searchInput.value = ''; }
                        });
                    })(String(u._id));
                    dd.appendChild(item);
                }
            }
            if (posts.length > 0) {
                dd.appendChild(searchSectionTitle('Locații'));
                for (let pi = 0; pi < posts.length; pi++) {
                    const p = posts[pi];
                    const item2 = document.createElement('div');
                    item2.className = 'search-item search-post';
                    const icon = document.createElement('i');
                    icon.className = 'fa-solid fa-map-location-dot search-icon';
                    item2.appendChild(icon);
                    const titleSpan = document.createElement('span');
                    titleSpan.textContent = p.title;
                    item2.appendChild(titleSpan);
                    (function(pid) {
                        item2.addEventListener('click', function() {
                            if (window.populateAndOpenModal) { window.populateAndOpenModal(pid); }
                            dd.classList.add('hidden');
                            if (searchInput) { searchInput.value = ''; }
                        });
                    })(p._id);
                    dd.appendChild(item2);
                }
            }
        } catch (e) {
            dd.replaceChildren();
            statusMsg(dd, 'Eroare la căutare.').className = 'search-empty';
        }
    }
    // harta - traseele celor urmariti
    const hartaLinks = document.querySelectorAll('.main-nav a');
    for (let h = 0; h < hartaLinks.length; h++) {
        if (hartaLinks[h].textContent.trim() === 'Harta') {
            hartaLinks[h].addEventListener('click', function(e) {
                e.preventDefault();
                openFollowingMap();
            });
            break;
        }
    }
    let followingMapInstance = null;
    function openFollowingMap() {
        const overlay = document.getElementById('following-map-overlay');
        if (!overlay) { return; }
        overlay.classList.remove('hidden');
        initFollowingMap();
    }
    const closeFollowingMapBtn = document.getElementById('close-following-map');
    if (closeFollowingMapBtn) {
        closeFollowingMapBtn.addEventListener('click', function() {
            const overlay = document.getElementById('following-map-overlay');
            if (overlay) { overlay.classList.add('hidden'); }
        });
    }
    // Inchide overlay la click in afara continutului hartii
    const followingOverlay = document.getElementById('following-map-overlay');
    if (followingOverlay) {
        followingOverlay.addEventListener('click', function(e) {
            if (e.target === followingOverlay) { followingOverlay.classList.add('hidden'); }
        });
    }
    function mapEmptyState(container, icon, lines) {
        container.replaceChildren();
        const box = document.createElement('div');
        box.className = 'map-empty-state';
        const i = document.createElement('i');
        i.className = icon;
        box.appendChild(i);
        lines.forEach(function(line) {
            const p = document.createElement('p');
            if (line.small) { p.style.cssText = 'font-size:0.8rem;color:#666;'; }
            p.textContent = line.text;
            box.appendChild(p);
        });
        container.appendChild(box);
    }
    async function initFollowingMap() {
        const container = document.getElementById('following-map-container');
        if (!container || typeof L === 'undefined') { return; }
        const userStr = localStorage.getItem("user");
        if (!userStr) {
            mapEmptyState(container, 'fa-solid fa-map-location-dot', [{ text: 'Trebuie să fii autentificat pentru a vedea harta.' }]);
            return;
        }
        const userId = JSON.parse(userStr).id;
        // Distrug instanta veche si recreez containerul (fix Leaflet)
        if (followingMapInstance) {
            followingMapInstance.remove();
            followingMapInstance = null;
        }
        container.replaceChildren();
        const inner = document.createElement('div');
        inner.id = 'fm-inner';
        inner.style.cssText = 'width:100%;height:100%;';
        container.appendChild(inner);
        followingMapInstance = window.makeMap('fm-inner', { center: [45.9432, 24.9668], zoom: 7 });
        try {
            const res   = await fetch('http://localhost:5000/api/posts/following/' + userId);
            const posts = await res.json();
            // Adaug postele din lista globala daca nu e pe profil.html
            if (window.postsArray && Array.isArray(posts)) {
                for (let i = 0; i < posts.length; i++) {
                    if (!window.postsArray.find(function(p) { return p._id === posts[i]._id; })) {
                        window.postsArray.push(posts[i]);
                    }
                }
            }
            if (!posts || posts.length === 0) {
                mapEmptyState(container, 'fa-solid fa-map-location-dot', [
                    { text: 'Nicio locație de la persoanele urmărite.' },
                    { text: 'Urmărește utilizatori care au postat trasee ca să le vezi aici.', small: true }
                ]);
                return;
            }
            const bounds = [];
            for (let j = 0; j < posts.length; j++) {
                const post = posts[j];
                if (!post.route || post.route.length === 0) { continue; }
                // Traseu ca polyline
                const latlngs = [];
                for (let k = 0; k < post.route.length; k++) {
                    latlngs.push([post.route[k].lat, post.route[k].lng]);
                    bounds.push([post.route[k].lat, post.route[k].lng]);
                }
                L.polyline(latlngs, { color: '#4cd137', weight: 3, opacity: 0.8 }).addTo(followingMapInstance);
                // Marker la primul waypoint al traseului
                const wp0     = post.route[0];
                const uname   = post.user ? post.user.username : 'Utilizator';
                const marker  = L.marker([wp0.lat, wp0.lng]).addTo(followingMapInstance);

                const pop = document.createElement('div');
                pop.style.minWidth = '150px';
                const strong = document.createElement('strong');
                strong.textContent = post.title;
                pop.appendChild(strong);
                pop.appendChild(document.createElement('br'));
                const sub = document.createElement('span');
                sub.style.cssText = 'color:#4cd137;font-size:0.8rem;';
                sub.textContent = uname + ' • ' + post.difficulty;
                pop.appendChild(sub);
                pop.appendChild(document.createElement('br'));
                const link = document.createElement('a');
                link.href = '#';
                link.style.cssText = 'color:#4cd137;font-size:0.8rem;';
                link.textContent = 'Deschide traseu';
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const overlay = document.getElementById('following-map-overlay');
                    if (overlay) { overlay.classList.add('hidden'); }
                    if (window.populateAndOpenModal) { window.populateAndOpenModal(post._id); }
                });
                pop.appendChild(link);
                marker.bindPopup(pop);
            }
            if (bounds.length > 0) {
                followingMapInstance.fitBounds(bounds, { padding: [40, 40] });
            }
        } catch (e) {
            mapEmptyState(container, 'fa-solid fa-map-location-dot', [{ text: 'Eroare la încărcarea traseelor.' }]);
        }
        setTimeout(function() {
            if (followingMapInstance) { followingMapInstance.invalidateSize(); }
        }, 200);
    }
    // ---- Admin panel ----
    let currentUser = _initUser ? JSON.parse(_initUser) : null;
    function updateStoredUser(u) {
        if (u) { currentUser = u; localStorage.setItem('user', JSON.stringify(u)); }
    }
    let adminPanel = null, adminList = null, adminUsersList = null;
    function hideAdminPanel() {
        if (adminPanel) { adminPanel.hidden = true; adminPanel.style.display = 'none'; }
        const root = document.getElementById('admin-panel-root');
        if (root) { root.replaceChildren(); }
        const lb = document.getElementById('leaderboard-sidebar');
        if (lb) { lb.style.display = ''; }
    }
    function buildAdminSection(title, listId, countId) {
        const section = document.createElement('div');
        section.className = 'admin-section';
        const titleRow = document.createElement('div');
        titleRow.className = 'admin-section-title';
        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        const countSpan = document.createElement('span');
        countSpan.className = 'admin-section-count';
        countSpan.id = countId;
        titleRow.append(titleSpan, countSpan);
        const list = document.createElement('ul');
        list.className = 'admin-list';
        list.id = listId;
        section.append(titleRow, list);
        return section;
    }
    function ensureAdminPanel() {
        if (!document.getElementById('admin-panel')) {
            const root = document.getElementById('admin-panel-root');
            if (!root) { return null; }
            const card = document.createElement('div');
            card.className = 'sidebar-card admin-panel-card';
            card.id = 'admin-panel';
            const header = document.createElement('div');
            header.className = 'admin-panel-header';
            const badge = document.createElement('span');
            badge.className = 'admin-badge';
            badge.textContent = '◆';
            const h3 = document.createElement('h3');
            h3.textContent = 'Panou Admin';
            header.append(badge, h3);
            card.appendChild(header);
            card.appendChild(buildAdminSection('Postări', 'admin-post-list', 'admin-posts-count'));
            card.appendChild(buildAdminSection('Utilizatori', 'admin-user-list', 'admin-users-count'));
            root.prepend(card);
        }
        adminPanel = document.getElementById('admin-panel');
        adminList = document.getElementById('admin-post-list');
        adminUsersList = document.getElementById('admin-user-list');
        return adminPanel;
    }
    function resolveUserRole(callback) {
        if (!currentUser || !currentUser.id) { hideAdminPanel(); return callback('user'); }
        fetch('http://localhost:5000/api/auth/user/' + currentUser.id)
            .then(function(r) { if (!r.ok) { throw new Error(); } return r.json(); })
            .then(function(profile) {
                const role = (profile && profile.role) ? profile.role : 'user';
                if (profile && profile.username) { currentUser.username = profile.username; }
                currentUser.role = role;
                updateStoredUser(currentUser);
                callback(role);
            })
            .catch(function() { hideAdminPanel(); callback('user'); });
    }
    function adminRow(title, sub, onDelete) {
        const li = document.createElement('li');
        li.className = 'admin-list-item';
        const info = document.createElement('span');
        info.className = 'admin-item-info';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'admin-item-title';
        titleSpan.textContent = title;
        const subSpan = document.createElement('span');
        subSpan.className = 'admin-item-sub';
        subSpan.textContent = sub;
        info.append(titleSpan, subSpan);
        const delBtn = document.createElement('button');
        delBtn.className = 'admin-del-btn';
        delBtn.title = 'Sterge';
        const trash = document.createElement('i');
        trash.className = 'fa-solid fa-trash';
        delBtn.appendChild(trash);
        delBtn.addEventListener('click', onDelete);
        li.append(info, delBtn);
        return li;
    }
    function renderAdminPanel() {
        resolveUserRole(function(role) {
            if (role !== 'admin') { hideAdminPanel(); return; }
            const lb = document.getElementById('leaderboard-sidebar');
            if (lb) { lb.style.display = 'none'; }
            ensureAdminPanel();
            if (!adminPanel) { return; }
            adminPanel.hidden = false;
            adminPanel.style.display = '';
            // Incarc postari
            fetch('http://localhost:5000/api/posts')
                .then(function(r) { return r.json(); })
                .then(function(posts) {
                    const countEl = document.getElementById('admin-posts-count');
                    if (countEl) { countEl.textContent = posts.length; }
                    if (!adminList) { return; }
                    adminList.replaceChildren();
                    for (let i = 0; i < Math.min(posts.length, 20); i++) {
                        const p = posts[i];
                        const pTitle = p.title || 'Fara titlu';
                        const pUser  = p.user && p.user.username ? p.user.username : 'Utilizator';
                        const li = adminRow(pTitle, pUser, function() {
                            if (!confirm('Stergi postarea?')) { return; }
                            fetch('http://localhost:5000/api/posts/' + p._id, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: currentUser.id, isAdmin: true })
                            }).then(function(r) {
                                if (r.ok) {
                                    li.remove();
                                    if (window.postsArray) {
                                        window.postsArray = window.postsArray.filter(function(x) { return String(x._id) !== String(p._id); });
                                    }
                                    const fc = document.getElementById('feed-container');
                                    if (fc) {
                                        const card = fc.querySelector('[data-id="' + p._id + '"]');
                                        if (card) { card.remove(); }
                                    }
                                } else { alert('Eroare la stergere.'); }
                            }).catch(function() { alert('Eroare la stergere.'); });
                        });
                        adminList.appendChild(li);
                    }
                }).catch(function() {});
            // Incarc utilizatori
            fetch('http://localhost:5000/api/auth/users')
                .then(function(r) { return r.json(); })
                .then(function(users) {
                    const countEl2 = document.getElementById('admin-users-count');
                    if (countEl2) { countEl2.textContent = users.length; }
                    if (!adminUsersList) { return; }
                    adminUsersList.replaceChildren();
                    for (let j = 0; j < users.length; j++) {
                        const u = users[j];
                        const li2 = adminRow(u.username, (u.email || '') + ' • ' + (u.role || 'user'), function() {
                            if (!confirm('Stergi utilizatorul ' + u.username + '?')) { return; }
                            fetch('http://localhost:5000/api/auth/user/' + u._id, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ adminId: currentUser.id })
                            }).then(function(r) {
                                if (r.ok) { li2.remove(); }
                                else { alert('Eroare la stergere utilizator.'); }
                            }).catch(function() { alert('Eroare la stergere utilizator.'); });
                        });
                        adminUsersList.appendChild(li2);
                    }
                }).catch(function() {});
        });
    }
    renderAdminPanel();
});
// ataseaza click pe un item de notificare
window.attachNotifClick = function(el, notif) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', async function() {
        const type = notif.type;
        const senderId = notif.sender ? String(notif.sender._id || notif.sender) : null;
        const postId = notif.post   ? String(notif.post._id   || notif.post)   : null;
        if (type === 'follow' && senderId) {
            window.location.href = 'profil.html?id=' + senderId;
            return;
        }
        if (!postId) { return; }
        // Caut postarea in array-ul global; daca nu e, o iau de la server
        let found = window.postsArray && window.postsArray.find(function(p) { return String(p._id) === postId; });
        if (!found) {
            try {
                const res = await fetch('http://localhost:5000/api/posts/' + postId);
                if (res.ok) {
                    found = await res.json();
                    if (!window.postsArray) { window.postsArray = []; }
                    window.postsArray.push(found);
                }
            } catch (e) { return; }
        }
        if (found && window.populateAndOpenModal) {
            window.populateAndOpenModal(postId);
        }
    });
};
// Mobile bottom nav - toggle panouri laterale
(function() {
    const btnFeed    = document.getElementById('mob-btn-feed');
    const btnPost    = document.getElementById('mob-btn-post');
    const btnGems    = document.getElementById('mob-btn-gems');
    const btnMsg     = document.getElementById('mob-btn-msg');
    const backdrop   = document.getElementById('mobile-panel-backdrop');
    const leftPanel  = document.querySelector('.left-main');
    const rightPanel = document.querySelector('.right-main');
    if (!btnFeed || !btnGems || !btnMsg) { return; }

    function closePanels() {
        if (leftPanel)  { leftPanel.classList.remove('mobile-open'); }
        if (rightPanel) { rightPanel.classList.remove('mobile-open'); }
        if (backdrop)   { backdrop.classList.add('hidden'); }
        btnFeed.classList.add('active');
        btnGems.classList.remove('active');
        btnMsg.classList.remove('active');
    }

    btnFeed.addEventListener('click', function() {
        closePanels();
    });

    if (btnPost) {
        btnPost.addEventListener('click', function() {
            closePanels();
            const postModal = document.getElementById('create-post-modal');
            if (postModal && window.openModal) {
                window.openModal(postModal);
                if (window.initCreateMap) { window.initCreateMap(); }
            }
        });
    }

    btnGems.addEventListener('click', function() {
        const isOpen = leftPanel && leftPanel.classList.contains('mobile-open');
        closePanels();
        if (!isOpen) {
            if (leftPanel)  { leftPanel.classList.add('mobile-open'); }
            if (backdrop)   { backdrop.classList.remove('hidden'); }
            btnFeed.classList.remove('active');
            btnGems.classList.add('active');
        }
    });

    btnMsg.addEventListener('click', function() {
        const isOpen = rightPanel && rightPanel.classList.contains('mobile-open');
        closePanels();
        if (!isOpen) {
            if (rightPanel) { rightPanel.classList.add('mobile-open'); }
            if (backdrop)   { backdrop.classList.remove('hidden'); }
            btnFeed.classList.remove('active');
            btnMsg.classList.add('active');
        }
    });

    if (backdrop) {
        backdrop.addEventListener('click', function() {
            closePanels();
        });
    }
})();
