function hasAvatar(url) {
    return url && url.indexOf('pravatar.cc') === -1;
}
function avHTML(url, cls, id) {
    var realUrl = hasAvatar(url) ? url : '';
    var sizeClass = cls === 'avatar-micro' ? 'av-xs' : cls === 'avatar-small' ? 'av-sm' : '';
    var idAttr = id ? ' id="' + id + '"' : '';
    var imgPart = realUrl ? '<img src="' + realUrl + '" class="' + (cls || 'avatar') + '"' + idAttr + ' alt="Avatar">' : '';
    return '<div class="av-wrap ' + sizeClass + '"><i class="fa-solid fa-user"></i>' + imgPart + '</div>';
}
document.addEventListener("DOMContentLoaded", function() {
    // Initializez avatar si username din header cu datele din localStorage
    var _initUser = localStorage.getItem("user");
    if (_initUser) {
        var _u = JSON.parse(_initUser);
        var _avatars   = document.querySelectorAll('.profile-trigger .avatar');
        var _usernames = document.querySelectorAll('.profile-trigger .username');
        for (var _i = 0; _i < _avatars.length;   _i++) { if (hasAvatar(_u.avatar)) { _avatars[_i].src = _u.avatar; _avatars[_i].classList.remove('av-hidden'); } }
        for (var _j = 0; _j < _usernames.length; _j++) { if (_u.username) { _usernames[_j].textContent = _u.username; } }
    }
    // Iau referinte la butoanele si dropdown-urile din header
    var btnNotifications = document.getElementById("btn-notifications");
    var dropdownNotifications = document.getElementById("dropdown-notifications");
    var btnProfile = document.getElementById("btn-profile");
    var dropdownProfile = document.getElementById("dropdown-profile");
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
        var closeBtn = e.target.closest("[data-close]");
        if (closeBtn) {
            e.preventDefault();
            var modalId = closeBtn.getAttribute("data-close");
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
    var logoutLink = document.querySelector('.dropdown-link.logout');
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
    var searchInput = document.querySelector('.search-bar input');
    var searchDropdown = null;
    var searchTimeout  = null;
    function getOrCreateDropdown() {
        if (searchDropdown) { return searchDropdown; }
        searchDropdown = document.createElement('div');
        searchDropdown.className = 'search-dropdown hidden';
        var bar = document.querySelector('.search-bar');
        if (bar) { bar.appendChild(searchDropdown); }
        return searchDropdown;
    }
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            var q = this.value.trim();
            clearTimeout(searchTimeout);
            if (q.length < 2) {
                var dd = getOrCreateDropdown();
                dd.classList.add('hidden');
                dd.innerHTML = '';
                return;
            }
            searchTimeout = setTimeout(function() { doSearch(q); }, 300);
        });
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                var dd = getOrCreateDropdown();
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
    async function doSearch(q) {
        console.log('search:', q);
        var dd = getOrCreateDropdown();
        dd.innerHTML = '<div class="search-loading">Se cauta...</div>';
        dd.classList.remove('hidden');
        try {
            var res   = await fetch('http://localhost:5000/api/auth/search?q=' + encodeURIComponent(q));
            var data  = await res.json();
            var users = data.users || [];
            // Cauta titluri de trasee in array-ul global deja incarcat
            var posts = [];
            if (window.postsArray && window.postsArray.length > 0) {
                var ql = q.toLowerCase();
                for (var i = 0; i < window.postsArray.length; i++) {
                    var post = window.postsArray[i];
                    if (post.title && post.title.toLowerCase().indexOf(ql) !== -1) {
                        posts.push(post);
                        if (posts.length >= 5) { break; }
                    }
                }
            }
            dd.innerHTML = '';
            if (users.length === 0 && posts.length === 0) {
                dd.innerHTML = '<div class="search-empty">Niciun rezultat găsit.</div>';
                return;
            }
            if (users.length > 0) {
                dd.insertAdjacentHTML('beforeend', '<div class="search-section-title">Persoane</div>');
                for (var ui = 0; ui < users.length; ui++) {
                    var u = users[ui];
                    var avatar = u.avatar || '';
                    var item = document.createElement('div');
                    item.className = 'search-item search-user';
                    item.innerHTML = avHTML(avatar, 'avatar-micro') + '<span>' + u.username + '</span>';
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
                dd.insertAdjacentHTML('beforeend', '<div class="search-section-title">Locații</div>');
                for (var pi = 0; pi < posts.length; pi++) {
                    var p = posts[pi];
                    var item2 = document.createElement('div');
                    item2.className = 'search-item search-post';
                    item2.innerHTML = '<i class="fa-solid fa-map-location-dot search-icon"></i>' +
                                      '<span>' + p.title + '</span>';
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
            dd.innerHTML = '<div class="search-empty">Eroare la căutare.</div>';
        }
    }
    // harta - traseele celor urmariti
    var hartaLinks = document.querySelectorAll('.main-nav a');
    for (var h = 0; h < hartaLinks.length; h++) {
        if (hartaLinks[h].textContent.trim() === 'Harta') {
            hartaLinks[h].addEventListener('click', function(e) {
                e.preventDefault();
                openFollowingMap();
            });
            break;
        }
    }
    var followingMapInstance = null;
    function openFollowingMap() {
        var overlay = document.getElementById('following-map-overlay');
        if (!overlay) { return; }
        overlay.classList.remove('hidden');
        initFollowingMap();
    }
    var closeFollowingMapBtn = document.getElementById('close-following-map');
    if (closeFollowingMapBtn) {
        closeFollowingMapBtn.addEventListener('click', function() {
            var overlay = document.getElementById('following-map-overlay');
            if (overlay) { overlay.classList.add('hidden'); }
        });
    }
    // Inchide overlay la click in afara continutului hartii
    var followingOverlay = document.getElementById('following-map-overlay');
    if (followingOverlay) {
        followingOverlay.addEventListener('click', function(e) {
            if (e.target === followingOverlay) { followingOverlay.classList.add('hidden'); }
        });
    }
    async function initFollowingMap() {
        var container = document.getElementById('following-map-container');
        if (!container || typeof L === 'undefined') { return; }
        var userStr = localStorage.getItem("user");
        if (!userStr) {
            container.innerHTML = '<div class="map-empty-state"><i class="fa-solid fa-map-location-dot"></i><p>Trebuie să fii autentificat pentru a vedea harta.</p></div>';
            return;
        }
        var userId = JSON.parse(userStr).id;
        // Distrug instanta veche si recreez containerul (fix Leaflet)
        if (followingMapInstance) {
            followingMapInstance.remove();
            followingMapInstance = null;
        }
        container.innerHTML = '<div id="fm-inner" style="width:100%;height:100%;"></div>';
        followingMapInstance = L.map('fm-inner').setView([45.9432, 24.9668], 7);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(followingMapInstance);
        try {
            var res   = await fetch('http://localhost:5000/api/posts/following/' + userId);
            var posts = await res.json();
            // Adaug postele din lista globala daca nu e pe profil.html
            if (window.postsArray && Array.isArray(posts)) {
                for (var i = 0; i < posts.length; i++) {
                    if (!window.postsArray.find(function(p) { return p._id === posts[i]._id; })) {
                        window.postsArray.push(posts[i]);
                    }
                }
            }
            if (!posts || posts.length === 0) {
                container.innerHTML = '<div class="map-empty-state"><i class="fa-solid fa-map-location-dot"></i><p>Nicio locație de la persoanele urmărite.</p><p style="font-size:0.8rem;color:#666;">Urmărește utilizatori care au postat trasee ca să le vezi aici.</p></div>';
                return;
            }
            var bounds = [];
            for (var j = 0; j < posts.length; j++) {
                var post = posts[j];
                if (!post.route || post.route.length === 0) { continue; }
                // Traseu ca polyline
                var latlngs = [];
                for (var k = 0; k < post.route.length; k++) {
                    latlngs.push([post.route[k].lat, post.route[k].lng]);
                    bounds.push([post.route[k].lat, post.route[k].lng]);
                }
                L.polyline(latlngs, { color: '#4cd137', weight: 3, opacity: 0.8 }).addTo(followingMapInstance);
                // Marker la primul waypoint al traseului
                var wp0     = post.route[0];
                var uname   = post.user ? post.user.username : 'Utilizator';
                var marker  = L.marker([wp0.lat, wp0.lng]).addTo(followingMapInstance);
                marker.bindPopup(
                    '<div style="min-width:150px;">' +
                    '<strong>' + post.title + '</strong><br>' +
                    '<span style="color:#4cd137;font-size:0.8rem;">' + uname + ' • ' + post.difficulty + '</span>' +
                    '<br><a href="#" style="color:#4cd137;font-size:0.8rem;" data-pid="' + post._id + '" class="fm-open-post">Deschide traseu</a>' +
                    '</div>'
                );
                // Click pe link din popup
                (function(postId) {
                    marker.on('popupopen', function() {
                        var link = document.querySelector('.fm-open-post[data-pid="' + postId + '"]');
                        if (link) {
                            link.addEventListener('click', function(e) {
                                e.preventDefault();
                                var overlay = document.getElementById('following-map-overlay');
                                if (overlay) { overlay.classList.add('hidden'); }
                                if (window.populateAndOpenModal) { window.populateAndOpenModal(postId); }
                            });
                        }
                    });
                })(post._id);
            }
            if (bounds.length > 0) {
                followingMapInstance.fitBounds(bounds, { padding: [40, 40] });
            }
        } catch (e) {
            container.innerHTML = '<div class="map-empty-state"><i class="fa-solid fa-map-location-dot"></i><p>Eroare la încărcarea traseelor.</p></div>';
        }
        setTimeout(function() {
            if (followingMapInstance) { followingMapInstance.invalidateSize(); }
        }, 200);
    }
    // ---- Admin panel ----
    var currentUser = _initUser ? JSON.parse(_initUser) : null;
    function updateStoredUser(u) {
        if (u) { currentUser = u; localStorage.setItem('user', JSON.stringify(u)); }
    }
    var adminPanel = null, adminList = null, adminUsersList = null;
    function hideAdminPanel() {
        if (adminPanel) { adminPanel.hidden = true; adminPanel.style.display = 'none'; }
        var root = document.getElementById('admin-panel-root');
        if (root) { root.innerHTML = ''; }
        var lb = document.getElementById('leaderboard-sidebar');
        if (lb) { lb.style.display = ''; }
    }
    function ensureAdminPanel() {
        if (!document.getElementById('admin-panel')) {
            var root = document.getElementById('admin-panel-root');
            if (!root) { return null; }
            root.insertAdjacentHTML('afterbegin', [
                '<div class="sidebar-card admin-panel-card" id="admin-panel">',
                '<div class="admin-panel-header"><span class="admin-badge">&#9670;</span><h3>Panou Admin</h3></div>',
                '<div class="admin-section">',
                '<div class="admin-section-title"><span>Postări</span><span class="admin-section-count" id="admin-posts-count"></span></div>',
                '<ul id="admin-post-list" class="admin-list"></ul>',
                '</div>',
                '<div class="admin-section">',
                '<div class="admin-section-title"><span>Utilizatori</span><span class="admin-section-count" id="admin-users-count"></span></div>',
                '<ul id="admin-user-list" class="admin-list"></ul>',
                '</div>',
                '</div>'
            ].join(''));
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
                var role = (profile && profile.role) ? profile.role : 'user';
                if (profile && profile.username) { currentUser.username = profile.username; }
                currentUser.role = role;
                updateStoredUser(currentUser);
                callback(role);
            })
            .catch(function() { hideAdminPanel(); callback('user'); });
    }
    function renderAdminPanel() {
        resolveUserRole(function(role) {
            if (role !== 'admin') { hideAdminPanel(); return; }
            var lb = document.getElementById('leaderboard-sidebar');
            if (lb) { lb.style.display = 'none'; }
            ensureAdminPanel();
            if (!adminPanel) { return; }
            adminPanel.hidden = false;
            adminPanel.style.display = '';
            // Incarc postari
            fetch('http://localhost:5000/api/posts')
                .then(function(r) { return r.json(); })
                .then(function(posts) {
                    var countEl = document.getElementById('admin-posts-count');
                    if (countEl) { countEl.textContent = posts.length; }
                    if (!adminList) { return; }
                    adminList.innerHTML = '';
                    for (var i = 0; i < Math.min(posts.length, 20); i++) {
                        var p = posts[i];
                        var li = document.createElement('li');
                        li.className = 'admin-list-item';
                        var pTitle = p.title || 'Fara titlu';
                        var pUser  = p.user && p.user.username ? p.user.username : 'Utilizator';
                        li.innerHTML =
                            '<span class="admin-item-info"><span class="admin-item-title">' + pTitle + '</span>' +
                            '<span class="admin-item-sub">' + pUser + '</span></span>' +
                            '<button class="admin-del-btn" title="Sterge postarea" data-postid="' + p._id + '">' +
                            '<i class="fa-solid fa-trash"></i></button>';
                        (function(postId) {
                            var delBtn = li.querySelector('.admin-del-btn');
                            delBtn.addEventListener('click', function() {
                                if (!confirm('Stergi postarea?')) { return; }
                                fetch('http://localhost:5000/api/posts/' + postId, {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: currentUser.id, isAdmin: true })
                                }).then(function(r) {
                                    if (r.ok) {
                                        li.remove();
                                        if (window.postsArray) {
                                            window.postsArray = window.postsArray.filter(function(x) { return String(x._id) !== postId; });
                                        }
                                        var fc = document.getElementById('feed-container');
                                        if (fc) {
                                            var card = fc.querySelector('[data-post-id="' + postId + '"]');
                                            if (card) { card.remove(); }
                                        }
                                    } else { alert('Eroare la stergere.'); }
                                }).catch(function() { alert('Eroare la stergere.'); });
                            });
                        })(String(p._id));
                        adminList.appendChild(li);
                    }
                }).catch(function() {});
            // Incarc utilizatori
            fetch('http://localhost:5000/api/auth/users')
                .then(function(r) { return r.json(); })
                .then(function(users) {
                    var countEl2 = document.getElementById('admin-users-count');
                    if (countEl2) { countEl2.textContent = users.length; }
                    if (!adminUsersList) { return; }
                    adminUsersList.innerHTML = '';
                    for (var j = 0; j < users.length; j++) {
                        var u = users[j];
                        var li2 = document.createElement('li');
                        li2.className = 'admin-list-item';
                        var uRole = u.role || 'user';
                        var uEmail = u.email || '';
                        li2.innerHTML =
                            '<span class="admin-item-info"><span class="admin-item-title">' + u.username + '</span>' +
                            '<span class="admin-item-sub">' + uEmail + ' • ' + uRole + '</span></span>' +
                            '<button class="admin-del-btn" title="Sterge utilizatorul" data-uid="' + u._id + '">' +
                            '<i class="fa-solid fa-trash"></i></button>';
                        (function(uid, uname) {
                            var delBtn2 = li2.querySelector('.admin-del-btn');
                            delBtn2.addEventListener('click', function() {
                                if (!confirm('Stergi utilizatorul ' + uname + '?')) { return; }
                                fetch('http://localhost:5000/api/auth/user/' + uid, {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ adminId: currentUser.id })
                                }).then(function(r) {
                                    if (r.ok) { li2.remove(); }
                                    else { alert('Eroare la stergere utilizator.'); }
                                }).catch(function() { alert('Eroare la stergere utilizator.'); });
                            });
                        })(String(u._id), u.username);
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
        var type = notif.type;
        var senderId = notif.sender ? String(notif.sender._id || notif.sender) : null;
        var postId = notif.post   ? String(notif.post._id   || notif.post)   : null;
        if (type === 'follow' && senderId) {
            window.location.href = 'profil.html?id=' + senderId;
            return;
        }
        if (!postId) { return; }
        // Caut postarea in array-ul global; daca nu e, o iau de la server
        var found = window.postsArray && window.postsArray.find(function(p) { return String(p._id) === postId; });
        if (!found) {
            try {
                var res = await fetch('http://localhost:5000/api/posts/' + postId);
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
    var btnFeed    = document.getElementById('mob-btn-feed');
    var btnPost    = document.getElementById('mob-btn-post');
    var btnGems    = document.getElementById('mob-btn-gems');
    var btnMsg     = document.getElementById('mob-btn-msg');
    var backdrop   = document.getElementById('mobile-panel-backdrop');
    var leftPanel  = document.querySelector('.left-main');
    var rightPanel = document.querySelector('.right-main');
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
            var postModal = document.getElementById('create-post-modal');
            if (postModal && window.openModal) {
                window.openModal(postModal);
                if (window.initCreateMap) { window.initCreateMap(); }
            }
        });
    }

    btnGems.addEventListener('click', function() {
        var isOpen = leftPanel && leftPanel.classList.contains('mobile-open');
        closePanels();
        if (!isOpen) {
            if (leftPanel)  { leftPanel.classList.add('mobile-open'); }
            if (backdrop)   { backdrop.classList.remove('hidden'); }
            btnFeed.classList.remove('active');
            btnGems.classList.add('active');
        }
    });

    btnMsg.addEventListener('click', function() {
        var isOpen = rightPanel && rightPanel.classList.contains('mobile-open');
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