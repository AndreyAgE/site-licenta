document.addEventListener("DOMContentLoaded", function() {
    window.postsArray = [];
    const viewPostModal = document.getElementById("post-modal");
    const closeViewPostBtn = document.getElementById("close-post-btn");
    if (closeViewPostBtn && viewPostModal) {
        closeViewPostBtn.addEventListener("click", function() {
            viewPostModal.classList.add("hidden");
        });
    }
    if (viewPostModal) {
        viewPostModal.addEventListener("click", function(e) {
            if (e.target === viewPostModal) {
                viewPostModal.classList.add("hidden");
            }
        });
    }
    //cat timp a trecut de la o data
    function timeAgo(dateStr) {
        const diff = (Date.now() - new Date(dateStr)) / 1000;
        if (diff < 60){ return 'acum'; }
        if (diff < 3600){ return Math.floor(diff / 60) + 'm'; }
        if (diff < 86400){ return Math.floor(diff / 3600) + 'h'; }
        return Math.floor(diff / 86400) + 'z';
    }
    // Populeaza modalul cu datele postarii si deschide harta traseului
    window.populateAndOpenModal = function populateAndOpenModal(postId) {
        const post = window.postsArray.find(function(p) { return p._id === postId; });
        if (!post) { return; }
        viewPostModal.setAttribute('data-post-id', postId);
        // Header: avatar, username, locatie, descriere
        const avatarEl = document.getElementById('modal-avatar');
        const usernameEl = document.getElementById('modal-username');
        const locationEl = document.getElementById('modal-location');
        const descEl = document.getElementById('modal-description');
        if (avatarEl) {
            const avUrl = hasAvatar(post.user && post.user.avatar) ? post.user.avatar : '';
            if (avUrl) { avatarEl.src = avUrl; avatarEl.classList.remove('av-hidden'); }
            else { avatarEl.classList.add('av-hidden'); }
        }
        if (usernameEl) { usernameEl.innerText = post.user ? post.user.username : 'Utilizator Sters'; }
        if (locationEl) { locationEl.innerText = '📍 ' + post.title + ' • ' + post.difficulty + ' • ' + post.totalDistance; }
        if (descEl) { descEl.innerText = post.description || ''; }
        // Buton Gems
        const gemBtnEl = document.getElementById('modal-gem-btn');
        const gemPickerEl = document.getElementById('gem-picker');
        if (gemPickerEl) { gemPickerEl.classList.add('hidden'); }
        if (gemBtnEl) {
            gemBtnEl.innerText = post.gems > 0 ? '💎 ' + post.gems + ' Gems' : '💎 Ofera Gem';
            gemBtnEl.classList.toggle('gemmed', post.gems > 0);
        }
        // Buton Like
        const likeBtn = document.getElementById('modal-like-btn');
        if (likeBtn) {
            const userString = localStorage.getItem("user");
            const userId = userString ? JSON.parse(userString).id : null;
            const likeCount = post.likes ? post.likes.length : 0;
            const isLiked = false;
            if (userId && post.likes) {
                for (let li = 0; li < post.likes.length; li++) {
                    if (String(post.likes[li]) === String(userId)) { isLiked = true; break; }
                }
            }
            likeBtn.innerText = '❤️ ' + likeCount + ' Like' + (likeCount !== 1 ? 'uri' : '');
            likeBtn.classList.toggle('liked', isLiked);
        }
        // Sectiunea de comentarii
        const commentSection = document.getElementById('modal-comments-section');
        if (commentSection) {
            commentSection.innerHTML = '';
            if (post.comments && post.comments.length > 0) {
                for (let ci = 0; ci < post.comments.length; ci++) {
                    const comment = post.comments[ci];
                    const uname = comment.user ? comment.user.username : 'Utilizator';
                    const uavatar = (comment.user && comment.user.avatar) ? comment.user.avatar : '';
                    commentSection.insertAdjacentHTML('beforeend',
                        '<div class="comment-thread">' +
                            '<div class="comment">' +
                                avHTML(uavatar, 'avatar-micro') +
                                '<div class="comment-content">' +
                                    '<p><strong>' + uname + ':</strong> ' + comment.text + '</p>' +
                                    '<div class="comment-actions"><span class="comment-time">' + timeAgo(comment.createdAt) + '</span></div>' +
                                '</div>' +
                            '</div>' +
                        '</div>');
                }
            } else {
                commentSection.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px 0;">Fii primul care comenteaza!</p>';
            }
        }
        // Waypoints cu poze si descrieri
        const waypointsEl = document.getElementById('modal-waypoints');
        if (waypointsEl) {
            waypointsEl.innerHTML = '';
            if (post.route && post.route.length > 0) {
                for (let wi = 0; wi < post.route.length; wi++) {
                    const wp = post.route[wi];
                    waypointsEl.insertAdjacentHTML('beforeend',
                        '<div class="waypoint-card">' +
                            (wp.img ? '<img src="' + wp.img + '" class="waypoint-card-img" alt="' + wp.name + '">' : '') +
                            '<div class="waypoint-info">' +
                                '<div class="waypoint-name">📍 ' + (wi + 1) + '. ' + wp.name + '</div>' +
                                (wp.desc ? '<div class="waypoint-desc">' + wp.desc + '</div>' : '') +
                            '</div>' +
                        '</div>');
                }
            } else {
                waypointsEl.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px 0;">Niciun waypoint salvat.</p>';
            }
        }
        // Harta traseului
        const mapWrapper = document.getElementById('modal-map-wrapper');
        if (window.viewMapInstance) {
            window.viewMapInstance.remove();
            window.viewMapInstance = null;
        }
        if (mapWrapper) {
            mapWrapper.innerHTML = '<div id="view-map-container" style="width:100%;height:100%;"></div>';
        }
        viewPostModal.hidden = false;
        viewPostModal.classList.remove("hidden");
        // Butonul de follow
        const followBtn = document.getElementById('modal-follow-btn');
        if (followBtn) {
            const userStr3 = localStorage.getItem("user");
            const loggedId = userStr3 ? JSON.parse(userStr3).id : null;
            const authorId = post.user ? (post.user._id || post.user) : null;
            if (loggedId && authorId && String(loggedId) !== String(authorId)) {
                followBtn.style.display = 'inline-block';
                followBtn.textContent = 'Urmarire';
                followBtn.classList.remove('following');
            } else {
                followBtn.style.display = 'none';
            }
        }
        // Initializez harta cu traseul postarii
        window.viewMapInstance = L.map('view-map-container');
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(window.viewMapInstance);
        if (post.route && post.route.length > 0) {
            const latlngs = [];
            for (let ri = 0; ri < post.route.length; ri++) {
                latlngs.push([post.route[ri].lat, post.route[ri].lng]);
            }
            const polyline = L.polyline(latlngs, { color: '#4cd137', weight: 4 }).addTo(window.viewMapInstance);
            for (let mi = 0; mi < post.route.length; mi++) {
                L.marker([post.route[mi].lat, post.route[mi].lng])
                    .addTo(window.viewMapInstance)
                    .bindPopup('<b>' + post.route[mi].name + '</b><br>' + (post.route[mi].desc || ''));
            }
            window.viewMapInstance.fitBounds(polyline.getBounds());
        } else {
            window.viewMapInstance.setView([45.94, 24.96], 7);
        }
        //recalculez dimensiunile dupa ce modalul e vizibil
        setTimeout(function() { window.viewMapInstance.invalidateSize(); }, 300);
    };
    //like in modal
    const modalLikeBtn = document.getElementById('modal-like-btn');
    if (modalLikeBtn) {
        modalLikeBtn.addEventListener("click", async function() {
            const postId = viewPostModal.getAttribute('data-post-id');
            const userString = localStorage.getItem("user");
            if (!userString) { alert("Trebuie sa fii logat!"); return; }
            const user = JSON.parse(userString);
            try {
                const response = await fetch("http://localhost:5000/api/posts/" + postId + "/like", {
                    method:  "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id })
                });
                if (response.ok) {
                    const data = await response.json();
                    modalLikeBtn.innerText = '❤️ ' + data.likes + ' Like' + (data.likes !== 1 ? 'uri' : '');
                    modalLikeBtn.classList.toggle('liked', data.liked);
                    const postInArr = window.postsArray.find(function(p) { return p._id === postId; });
                    if (postInArr) {
                        if (data.liked) {
                            postInArr.likes.push(user.id);
                        } else {
                            postInArr.likes = postInArr.likes.filter(function(id) {
                                return String(id) !== String(user.id);
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Eroare like:", err);
            }
        });
    }
    // gem picker din modal
    const modalGemBtn = document.getElementById('modal-gem-btn');
    const gemPicker = document.getElementById('gem-picker');
    const gemDecrement = document.getElementById('gem-decrement');
    const gemIncrement = document.getElementById('gem-increment');
    const gemAmountInput = document.getElementById('gem-amount-input');
    const gemConfirmBtn = document.getElementById('gem-confirm-btn');
    const gemPickerRemaining = document.getElementById('gem-picker-remaining');
    if (modalGemBtn && gemPicker) {
        modalGemBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userStr4 = localStorage.getItem("user");
            if (!userStr4) { alert("Trebuie sa fii logat!"); return; }
            const u = JSON.parse(userStr4);
            const bal = u.monthlyGems !== undefined ? u.monthlyGems : 0;
            if (gemPickerRemaining) { gemPickerRemaining.textContent = bal; }
            if (gemAmountInput) { gemAmountInput.value = 1; gemAmountInput.max = bal; }
            gemPicker.classList.toggle('hidden');
        });
        if (gemDecrement) {
            gemDecrement.addEventListener('click', function(e) {
                e.stopPropagation();
                const v = parseInt(gemAmountInput.value) || 1;
                if (v > 1) { gemAmountInput.value = v - 1; }
            });
        }
        if (gemIncrement) {
            gemIncrement.addEventListener('click', function(e) {
                e.stopPropagation();
                const u2 = JSON.parse(localStorage.getItem("user") || '{}');
                const max = u2.monthlyGems || 0;
                const v = parseInt(gemAmountInput.value) || 1;
                if (v < max) { gemAmountInput.value = v + 1; }
            });
        }
        if (gemConfirmBtn) {
            gemConfirmBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const amount = parseInt(gemAmountInput.value) || 0;
                if (amount < 1) { return; }
                const postId = viewPostModal.getAttribute('data-post-id');
                const userStr5 = localStorage.getItem("user");
                if (!userStr5) { alert("Trebuie sa fii logat!"); return; }
                const user = JSON.parse(userStr5);
                if ((user.monthlyGems || 0) < amount) {
                    alert("Nu ai destule gems! Ai " + (user.monthlyGems || 0) + " disponibili.");
                    return;
                }
                try {
                    const res = await fetch("http://localhost:5000/api/posts/" + postId + "/gem", {
                        method:  "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.id, amount: amount })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        user.monthlyGems = data.remainingGems;
                        localStorage.setItem("user", JSON.stringify(user));
                        modalGemBtn.innerText = '💎 ' + data.postGems + ' Gems';
                        modalGemBtn.classList.add('gemmed');
                        gemPicker.classList.add('hidden');
                        const gemsEl = document.getElementById('gems-remaining');//bara gems
                        if (gemsEl) { gemsEl.textContent = data.remainingGems; }
                        const fillEl = document.getElementById('gems-bar-fill');
                        if (fillEl) { fillEl.style.width = data.remainingGems + '%'; }
                        const postInArr2 = window.postsArray.find(function(p) { return p._id === postId; });
                        if (postInArr2) {
                            postInArr2.gems = data.postGems;
                            postInArr2.monthlyGems = (postInArr2.monthlyGems || 0) + amount;
                        }
                        loadLeaderboard();
                    } else {
                        const err = await res.json();
                        alert(err.message || "Eroare la trimiterea gems.");
                    }
                } catch (err){}
            });
        }
        document.addEventListener('click', function(e) {
            if (gemPicker && !gemPicker.contains(e.target) && e.target !== modalGemBtn) {
                gemPicker.classList.add('hidden');
            }
        });
    }
    // Initializez contorul de gems din header la incarcarea paginii
    (function initGemsCounter() {
        const userStr6 = localStorage.getItem("user");
        if (!userStr6) { return; }
        const u = JSON.parse(userStr6);
        const bal = u.monthlyGems !== undefined ? u.monthlyGems : 100;
        const gemsEl = document.getElementById('gems-remaining');
        if (gemsEl) { gemsEl.textContent = bal; }
        const fillEl = document.getElementById('gems-bar-fill');
        if (fillEl) { fillEl.style.width = bal + '%'; }
    })();
    // handler comentariu in modal
    const commentInput = document.querySelector('#post-modal .comment-input');
    const postCommentBtn = document.querySelector('#post-modal .post-comment-btn');
    if (postCommentBtn && commentInput) {
        postCommentBtn.addEventListener("click", async function() {
            const text = commentInput.value.trim();
            if (!text) { return; }
            const postId = viewPostModal.getAttribute('data-post-id');
            const userString = localStorage.getItem("user");
            if (!userString) { alert("Trebuie sa fii logat pentru a comenta!"); return; }
            const user = JSON.parse(userString);
            try {
                const response = await fetch("http://localhost:5000/api/posts/" + postId + "/comments", {
                    method:"POST",
                    headers: { "Content-Type": "application/json" },
                    body:JSON.stringify({ userId: user.id, text: text })
                });
                if (response.ok) {
                    const newComment = await response.json();
                    commentInput.value = '';
                    const commentSection2 = document.getElementById('modal-comments-section');
                    if (commentSection2) {
                        const emptyMsg = commentSection2.querySelector('p');
                        if (emptyMsg){ emptyMsg.remove(); }
                        const uname2 = (newComment.user && newComment.user.username) ? newComment.user.username : (user.username || 'Tu');
                        const uavatar2 = (newComment.user && newComment.user.avatar)   ? newComment.user.avatar   : '';
                        commentSection2.insertAdjacentHTML('beforeend',
                            '<div class="comment-thread">' +
                                '<div class="comment">' +
                                    avHTML(uavatar2, 'avatar-micro') +
                                    '<div class="comment-content">' +
                                        '<p><strong>' + uname2 + ':</strong> ' + text + '</p>' +
                                        '<div class="comment-actions"><span class="comment-time">acum</span></div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>');
                        const postInArray = window.postsArray.find(function(p) { return p._id === postId; });
                        if (postInArray) { postInArray.comments.push(newComment); }
                    }
                } else {
                    alert("Eroare la trimiterea comentariului.");
                }
            } catch (err){}
        });
        commentInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter") { postCommentBtn.click(); }
        });
    }
    // picker de gems din feed
    const currentFeedGemPostId = null;
    const currentFeedGemBtn = null;
    const feedGemPicker = document.getElementById('feed-gem-picker');
    const feedGemInput = document.getElementById('feed-gem-input');
    const feedGemRemaining = document.getElementById('feed-gem-remaining');
    function positionFeedPicker(triggerEl) {
        if (!feedGemPicker) { return; }
        feedGemPicker.style.visibility = 'hidden';
        feedGemPicker.style.bottom = 'auto';
        feedGemPicker.classList.remove('hidden');
        const rect = triggerEl.getBoundingClientRect();
        const ph = feedGemPicker.offsetHeight;
        const pw = feedGemPicker.offsetWidth;
        const top = rect.top - ph - 8;
        const left = rect.left;
        if (top < 10) { top = rect.bottom + 8; }
        if (left + pw > window.innerWidth - 10) { left = window.innerWidth - pw - 10; }
        feedGemPicker.style.top  = top  + 'px';
        feedGemPicker.style.left = left + 'px';
        feedGemPicker.style.visibility = '';
    }
    const feedContainer = document.getElementById("feed-container");
    if (feedContainer) {
        feedContainer.addEventListener("click", async function(e) {
            // A. Deschide modalul mare la click pe postare sau buton comentarii
            if (e.target.classList.contains("trigger-modal") || e.target.classList.contains("btn-comments")) {
                const postContainer = e.target.closest('.post-container');
                if (postContainer) {
                    const postId = postContainer.getAttribute('data-id');
                    populateAndOpenModal(postId);
                }
            }
            // B. Like din feed - apel API pentru persistenta
            if (e.target.classList.contains("btn-like")) {
                const postContainerLike = e.target.closest('.post-container');
                if (!postContainerLike) { return; }
                const postIdLike = postContainerLike.getAttribute('data-id');
                const userStringLike = localStorage.getItem("user");
                if (!userStringLike) { alert("Trebuie sa fii logat!"); return; }
                const userLike = JSON.parse(userStringLike);
                try {
                    const responseLike = await fetch("http://localhost:5000/api/posts/" + postIdLike + "/like", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: userLike.id })
                    });
                    if (responseLike.ok) {
                        const dataLike = await responseLike.json();
                        e.target.innerText = '❤️ ' + dataLike.likes + ' Like' + (dataLike.likes !== 1 ? 'uri' : '');
                        e.target.classList.toggle('liked', dataLike.liked);
                        const postInArrLike = window.postsArray.find(function(p) { return p._id === postIdLike; });
                        if (postInArrLike) {
                            if (!postInArrLike.likes) { postInArrLike.likes = []; }
                            if (dataLike.liked) {
                                postInArrLike.likes.push(userLike.id);
                            } else {
                                postInArrLike.likes = postInArrLike.likes.filter(function(id) {
                                    return String(id) !== String(userLike.id);
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error("Eroare like feed:", err);
                }
            }
            if (e.target.classList.contains("btn-gem")) {
                e.stopPropagation();
                const postContainer2 = e.target.closest('.post-container');
                if (!postContainer2) { return; }
                const postId2 = postContainer2.getAttribute('data-id');
                if (currentFeedGemPostId === postId2 && feedGemPicker && !feedGemPicker.classList.contains('hidden')) {
                    feedGemPicker.classList.add('hidden');
                    currentFeedGemPostId = null;
                    currentFeedGemBtn = null;
                    return;
                }
                currentFeedGemPostId = postId2;
                currentFeedGemBtn = e.target;
                const userStr7 = localStorage.getItem("user");
                if (!userStr7) { alert("Trebuie sa fii logat!"); return; }
                const u3 = JSON.parse(userStr7);
                const bal = u3.monthlyGems !== undefined ? u3.monthlyGems : 0;
                if (feedGemRemaining) { feedGemRemaining.textContent = bal; }
                if (feedGemInput){ feedGemInput.value = 1; feedGemInput.max = bal; }
                positionFeedPicker(e.target);
            }
        });
    }
    // Butoane picker gems din feed: minus, plus, Ofera
    const feedGemDec = document.getElementById('feed-gem-dec');
    const feedGemInc = document.getElementById('feed-gem-inc');
    const feedGemConfirm = document.getElementById('feed-gem-confirm');
    if (feedGemDec) {
        feedGemDec.addEventListener('click', function(e) {
            e.stopPropagation();
            const v = parseInt(feedGemInput.value) || 1;
            if (v > 1) { feedGemInput.value = v - 1; }
        });
    }
    if (feedGemInc) {
        feedGemInc.addEventListener('click', function(e) {
            e.stopPropagation();
            const u4 = JSON.parse(localStorage.getItem("user") || '{}');
            const max = u4.monthlyGems || 0;
            const v = parseInt(feedGemInput.value) || 1;
            if (v < max) { feedGemInput.value = v + 1; }
        });
    }
    if (feedGemConfirm) {
        feedGemConfirm.addEventListener('click', async function(e) {
            e.stopPropagation();
            const amount = parseInt(feedGemInput ? feedGemInput.value : 0) || 0;
            if (amount < 1 || !currentFeedGemPostId) { return; }
            const userStr8 = localStorage.getItem("user");
            if (!userStr8) { alert("Trebuie sa fii logat!"); return; }
            const user = JSON.parse(userStr8);

            if ((user.monthlyGems || 0) < amount) {
                alert("Nu ai destule gems! Ai " + (user.monthlyGems || 0) + " disponibili.");
                return;
            }
            const postId3 = currentFeedGemPostId;
            const btn = currentFeedGemBtn;
            try {
                const res = await fetch("http://localhost:5000/api/posts/" + postId3 + "/gem", {
                    method:"PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id, amount: amount })
                });
                if (res.ok) {
                    const data = await res.json();
                    user.monthlyGems = data.remainingGems;
                    localStorage.setItem("user", JSON.stringify(user));
                    if (btn) { btn.innerText = '💎 ' + data.postGems + ' Gems'; btn.classList.add('gemmed'); }
                    if (feedGemPicker) { feedGemPicker.classList.add('hidden'); }
                    currentFeedGemPostId = null;
                    currentFeedGemBtn = null;
                    const gemsEl2 = document.getElementById('gems-remaining');
                    if (gemsEl2) { gemsEl2.textContent = data.remainingGems; }
                    const fillEl2 = document.getElementById('gems-bar-fill');
                    if (fillEl2) { fillEl2.style.width = data.remainingGems + '%'; }
                    const postInArr3 = window.postsArray.find(function(p) { return p._id === postId3; });
                    if (postInArr3) {
                        postInArr3.gems = data.postGems;
                        postInArr3.monthlyGems = (postInArr3.monthlyGems || 0) + amount;
                    }
                    loadLeaderboard();
                } else {
                    const err2 = await res.json();
                    alert(err2.message || "Eroare la trimiterea gems.");
                }
            } catch (err){}
        });
    }
    // Inchide picker-ul feed la click in afara lui
    document.addEventListener('click', function(e) {
        if (feedGemPicker && !feedGemPicker.classList.contains('hidden') &&
            !feedGemPicker.contains(e.target) && !e.target.classList.contains('btn-gem')) {
            feedGemPicker.classList.add('hidden');
            currentFeedGemPostId = null;
            currentFeedGemBtn = null;
        }
    });
    // incarcare postari din baza de date
    async function loadPosts() {
        if (!feedContainer) { return; }
        try {
            const response = await fetch("http://localhost:5000/api/posts");
            const posts = await response.json();
            console.log("postari incarcate:", posts.length);
            window.postsArray = posts;
            feedContainer.innerHTML = "";
            if (posts.length === 0) {
                feedContainer.innerHTML = "<p style='color: white; text-align: center;'>Nu exista nicio postare inca.</p>";
                return;
            }
            for (let pi = 0; pi < posts.length; pi++) {
                const post = posts[pi];
                const userName = post.user ? post.user.username : "Utilizator Sters";
                const userAvatar = (post.user && post.user.avatar) ? post.user.avatar : '';
                // Colectez imaginile din waypoints
                const postImages = [];
                if (post.route && post.route.length > 0) {
                    for (let wi2 = 0; wi2 < post.route.length; wi2++) {
                        if (post.route[wi2].img) { postImages.push(post.route[wi2].img); }
                    }
                }
                if (postImages.length === 0) {
                    postImages.push("https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80");
                }
                //HTML-ul pentru caruselul de imagini
                const sliderHTML = '<div class="feed-media">';
                if (postImages.length > 1) {
                    sliderHTML += '<button class="carousel-btn prev-btn" onclick="event.stopPropagation(); moveSlide(\'' + post._id + '\', -1, ' + postImages.length + ')">&#10094;</button>';
                    sliderHTML += '<button class="carousel-btn next-btn" onclick="event.stopPropagation(); moveSlide(\'' + post._id + '\', 1, ' + postImages.length + ')">&#10095;</button>';
                }
                sliderHTML += '<div class="carousel-images" id="carousel-' + post._id + '">';
                for (let imgIdx = 0; imgIdx < postImages.length; imgIdx++) {
                    const displayStyle = imgIdx === 0 ? "block" : "none";
                    sliderHTML += '<img src="' + postImages[imgIdx] + '" id="img-' + post._id + '-' + imgIdx + '" class="post-image trigger-modal" style="display:' + displayStyle + ';cursor:pointer;" alt="Poza Traseu">';
                }
                sliderHTML += '</div>';
                if (postImages.length > 1) {
                    sliderHTML += '<div class="carousel-dots" id="dots-' + post._id + '">';
                    for (let dotIdx = 0; dotIdx < postImages.length; dotIdx++) {
                        const activeClass = dotIdx === 0 ? "active" : "";
                        sliderHTML += '<span class="dot ' + activeClass + '" id="dot-' + post._id + '-' + dotIdx + '" onclick="event.stopPropagation(); goToSlide(\'' + post._id + '\', ' + dotIdx + ', ' + postImages.length + ')"></span>';
                    }
                    sliderHTML += '</div>';
                }
                sliderHTML += '</div>';
                const loadUserStr = localStorage.getItem("user");
                const loadUserId = loadUserStr ? JSON.parse(loadUserStr).id : null;
                const likeCount = post.likes ? post.likes.length : 0;
                const isLiked = false;
                if (loadUserId && post.likes) {
                    for (let liIdx = 0; liIdx < post.likes.length; liIdx++) {
                        if (String(post.likes[liIdx]) === String(loadUserId)) { isLiked = true; break; }
                    }
                }
                const likeBtnClass = 'action-btn btn-like' + (isLiked ? ' liked' : '');
                const likeBtnText = '❤️ ' + likeCount + ' Like' + (likeCount !== 1 ? 'uri' : '');
                const postHTML =
                    '<div class="post-container" data-id="' + post._id + '">' +
                        '<div class="top-post">' +
                            avHTML(userAvatar, 'avatar') +
                            '<div class="card-user-info">' +
                                '<span class="card-username">' + userName + '</span>' +
                                '<span class="card-location">' + post.title + ' • ' + post.difficulty + ' • ' + post.totalDistance + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<p class="description">' + post.description + '</p>' +
                        sliderHTML +
                        '<div class="bot-post">' +
                            '<div class="actions">' +
                                '<button class="action-btn btn-gem' + (post.gems > 0 ? ' gemmed' : '') + '">💎 ' + (post.gems > 0 ? post.gems + ' Gems' : 'Ofera Gem') + '</button>' +
                                '<button class="' + likeBtnClass + '">' + likeBtnText + '</button>' +
                                '<button class="action-btn btn-comments">💬 Comentarii / Harta</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>';

                feedContainer.insertAdjacentHTML("beforeend", postHTML);
            }
        } catch (error) {
            console.error("Eroare la fetch postari:", error);
        }
    }
    // publicare postare noua
    const postForm = document.getElementById("post-form");
    const postModal = document.getElementById("create-post-modal");
    if (postForm) {
        postForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const userString = localStorage.getItem("user");
            if (!userString) { alert("Trebuie sa fii logat!"); return; }
            const user = JSON.parse(userString);
            const title = document.getElementById("post-title").value;
            const desc = document.getElementById("post-description").value;
            const terrain = document.getElementById("post-terrain").value;
            const difficulty = document.getElementById("post-difficulty").value;
            const statDistance = document.getElementById("stat-distance");
            const totalDistance = statDistance ? statDistance.innerText : "0 m";

            if (!window.waypoints || window.waypoints.length < 2) {
                alert("Adauga minim 2 puncte pe harta!");
                return;
            }
            // Formatez waypoint-urile pentru a fi salvate in BD
            const routeFormatted = [];
            for (let rfi = 0; rfi < window.waypoints.length; rfi++) {
                const wp2 = window.waypoints[rfi];
                routeFormatted.push({
                    lat: wp2.lat,
                    lng: wp2.lng,
                    name: wp2.name,
                    desc: wp2.desc || "",
                    img: wp2.img  || ""
                });
            }
            const postData = {
                userId: user.id, title: title, description: desc,
                terrain: terrain, difficulty: difficulty,
                totalDistance: totalDistance, route: routeFormatted
            };
            try {
                const response = await fetch("http://localhost:5000/api/posts", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(postData)
                });
                if (response.ok) {
                    alert("Traseul a fost publicat cu succes!");
                    postForm.reset();
                    if (typeof window.clearRouteData === "function") { window.clearRouteData(); }
                    if (postModal) { postModal.hidden = true; }
                    loadPosts();
                } else {
                    const errorData = await response.json();
                    alert("Eroare: " + errorData.message);
                }
            } catch (error) {
                alert("Serverul nu raspunde. Asigura-te ca node server.js ruleaza.");
            }
        });
    }
    loadPosts();
    loadLeaderboard();
    // socket.io - notificari si mesagerie in timp real
    const userStr2 = localStorage.getItem("user");
    if (userStr2 && typeof io !== 'undefined') {
        const currentUser = JSON.parse(userStr2);
        window.appSocket = io('http://localhost:5000');
        window.appSocket.on('connect', function() {
            window.appSocket.emit('join', currentUser.id);
        });
        // Notificare primita in timp real
        window.appSocket.on('notification', function(notif) {
            const badge = document.querySelector('#btn-notifications .badge');
            const prev = parseInt(badge ? badge.textContent : '0') || 0;
            if (badge) { badge.textContent = prev + 1; }
            const menu = document.getElementById('dropdown-notifications');
            if (menu && !menu.classList.contains('hidden')) {
                const avatar = notif.sender && notif.sender.avatar ? notif.sender.avatar : '';
                const name = notif.sender ? notif.sender.username : 'Cineva';
                const msg = name + ' ';
                if (notif.type === 'like'){ msg += 'a dat like la postarea ta.'; }
                else if (notif.type === 'gem'){ msg += 'ti-a oferit 💎 gems.'; }
                else if (notif.type === 'follow'){ msg += 'a inceput sa te urmareasca.'; }
                else if (notif.type === 'comment'){ msg += 'a comentat la postarea ta.'; }
                const div = document.createElement('div');
                div.className = 'notif-item notif-new';
                div.innerHTML = avHTML(avatar, 'avatar-micro') + '<span><strong>' + msg + '</strong></span>';
                if (window.attachNotifClick) { window.attachNotifClick(div, notif); }
                const h4 = menu.querySelector('h4');
                if (h4) { h4.after(div); } else { menu.prepend(div); }
            }
        });
        // DM primit in timp real
        window.appSocket.on('receiveDM', function(msg) {
            if (window.chatState && window.chatState.type === 'dm') {
                const senderId = String(msg.sender._id || msg.sender);
                if (senderId === String(window.chatState.otherId) || senderId === String(currentUser.id)) {
                    appendChatMsg(msg, senderId === String(currentUser.id));
                }
            }
        });
        // Mesaj de grup primit in timp real
        window.appSocket.on('receiveGroupMsg', function(data) {
            const groupId = data.groupId;
            const msg     = data.msg;
            if (window.chatState && window.chatState.type === 'group' && String(window.chatState.groupId) === String(groupId)) {
                appendChatMsg(msg, String(msg.sender._id || msg.sender) === String(currentUser.id));
            }
        });
        // Incarc notificarile la deschiderea paginii
        fetch("http://localhost:5000/api/notifications/" + currentUser.id)
            .then(function(r) { return r.json(); })
            .then(function(notifs) {
                const badge = document.querySelector('#btn-notifications .badge');
                if (badge) { badge.textContent = notifs.length > 0 ? notifs.length : ''; }
                const menu = document.getElementById('dropdown-notifications');
                if (!menu) { return; }
                const header = menu.querySelector('h4');
                menu.innerHTML = '';
                if (header) { menu.appendChild(header); }
                if (notifs.length === 0) {
                    menu.insertAdjacentHTML('beforeend', '<p style="color:#aaa;text-align:center;padding:15px;font-size:0.85rem;">Nicio notificare noua.</p>');
                } else {
                    for (let ni = 0; ni < notifs.length; ni++) {
                        const n = notifs[ni];
                        const avatar2 = n.sender && n.sender.avatar ? n.sender.avatar : '';
                        const div2 = document.createElement('div');
                        div2.className = 'notif-item notif-new';
                        const msg2 = (n.sender ? n.sender.username : 'Cineva') + ' ';
                        if (n.type === 'like'){ msg2 += 'a dat like la postarea ta.'; }
                        else if (n.type === 'gem'){ msg2 += 'ti-a oferit 💎 gems.'; }
                        else if (n.type === 'follow'){ msg2 += 'a inceput sa te urmareasca.'; }
                        else if (n.type === 'comment'){ msg2 += 'a comentat la postarea ta.'; }
                        div2.innerHTML = avHTML(avatar2, 'avatar-micro') + '<span>' + msg2 + '</span>';
                        if (window.attachNotifClick){ window.attachNotifClick(div2, n); }
                        menu.appendChild(div2);
                    }
                }
                // Marchez ca citite dupa ce userul deschide clopotul
                const btn = document.getElementById('btn-notifications');
                if (btn) {
                    btn.addEventListener('click', async function() {
                        await fetch("http://localhost:5000/api/notifications/read-all/" + currentUser.id, { method: 'PUT' });
                        setTimeout(function() { if (badge) { badge.textContent = ''; } }, 500);
                    }, { once: true });
                }
            })
            .catch(function() {});
        // Incarc lista de useri (DM) si grupurile
        loadDmList(currentUser);
        loadGroupsSection(currentUser);
    }
    window.chatState = null;
    // Adauga un mesaj in panoul de chat
    function appendChatMsg(msg, isMine) {
        const container = document.getElementById('chat-messages');
        if (!container) { return; }
        const div = document.createElement('div');
        div.className = 'chat-msg ' + (isMine ? 'mine' : 'theirs');
        const senderName = msg.sender ? (msg.sender.username || '') : '';
        if (!isMine && senderName) {
            div.innerHTML = '<span class="chat-msg-sender">' + senderName + '</span>' +
                            '<span class="chat-bubble">' + escapeHtml(msg.text) + '</span>';
        } else {
            div.innerHTML = '<span class="chat-bubble">' + escapeHtml(msg.text) + '</span>';
        }
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
    // Escape HTML ca sa nu se injecteze cod in chat
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    // Deschide chat cu un alt utilizator
    async function openDMChat(otherId, otherName, otherAvatar) {
        const userStr9 = localStorage.getItem("user");
        if (!userStr9) { return; }
        const me = JSON.parse(userStr9);
        window.chatState = { type: 'dm', otherId: otherId, otherName: otherName };
        const titleEl  = document.getElementById('chat-title');
        if (titleEl) { titleEl.textContent = otherName; }
        const leaveBtn = document.getElementById('leave-group-btn');
        if (leaveBtn) { leaveBtn.classList.add('hidden'); }
        const container = document.getElementById('chat-messages');
        if (container) { container.innerHTML = '<p style="color:#aaa;text-align:center;font-size:0.8rem;padding:20px 0;">Se incarca...</p>'; }
        const overlay = document.getElementById('chat-overlay');
        if (overlay) { overlay.classList.remove('hidden'); }
        try {
            const res  = await fetch("http://localhost:5000/api/messages/dm/" + me.id + "/" + otherId);
            const msgs = await res.json();
            if (container) {
                container.innerHTML = '';
                if (msgs.length === 0) {
                    container.innerHTML = '<p style="color:#aaa;text-align:center;font-size:0.8rem;padding:20px 0;">Niciun mesaj inca. Spune salut! 👋</p>';
                } else {
                    for (let dmi = 0; dmi < msgs.length; dmi++) {
                        appendChatMsg(msgs[dmi], String(msgs[dmi].sender._id || msgs[dmi].sender) === String(me.id));
                    }
                }
            }
        } catch (e) {
            if (container) { container.innerHTML = '<p style="color:#ff6b6b;text-align:center;font-size:0.8rem;">Eroare la incarcarea mesajelor.</p>'; }
        }
    }
    // Deschide chat de grup
    async function openGroupChat(groupId, groupName, isMember) {
        const userStr10 = localStorage.getItem("user");
        if (!userStr10) { return; }
        const me = JSON.parse(userStr10);
        window.chatState = { type: 'group', groupId: groupId, groupName: groupName };
        if (window.appSocket) { window.appSocket.emit('joinGroupRoom', groupId); }
        const titleEl  = document.getElementById('chat-title');
        if (titleEl) { titleEl.textContent = groupName; }
        const leaveBtn = document.getElementById('leave-group-btn');
        if (leaveBtn) { leaveBtn.classList.toggle('hidden', !isMember); }
        const container = document.getElementById('chat-messages');
        if (container) { container.innerHTML = '<p style="color:#aaa;text-align:center;font-size:0.8rem;padding:20px 0;">Se incarca...</p>'; }
        const overlay = document.getElementById('chat-overlay');
        if (overlay) { overlay.classList.remove('hidden'); }
        try {
            const res  = await fetch("http://localhost:5000/api/messages/group/" + groupId);
            const msgs = await res.json();
            if (container) {
                container.innerHTML = '';
                if (msgs.length === 0) {
                    container.innerHTML = '<p style="color:#aaa;text-align:center;font-size:0.8rem;padding:20px 0;">Niciun mesaj inca.</p>';
                } else {
                    for (let gmi = 0; gmi < msgs.length; gmi++) {
                        appendChatMsg(msgs[gmi], String(msgs[gmi].sender._id || msgs[gmi].sender) === String(me.id));
                    }
                }
            }
        } catch (e) {
            if (container) { container.innerHTML = '<p style="color:#ff6b6b;text-align:center;font-size:0.8rem;">Eroare la incarcarea mesajelor.</p>'; }
        }
    }
    // Buton X - inchidere chat
    const closeChatBtn = document.getElementById('close-chat-btn');
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', function() {
            const overlay = document.getElementById('chat-overlay');
            if (overlay) { overlay.classList.add('hidden'); }
            if (window.chatState && window.chatState.type === 'group' && window.appSocket) {
                window.appSocket.emit('leaveGroupRoom', window.chatState.groupId);
            }
            window.chatState = null;
        });
    }
    // Buton "Iesi din grup"
    const leaveGroupBtn = document.getElementById('leave-group-btn');
    if (leaveGroupBtn) {
        leaveGroupBtn.addEventListener('click', async function() {
            const userStr11 = localStorage.getItem("user");
            if (!userStr11 || !window.chatState || window.chatState.type !== 'group') { return; }
            const me = JSON.parse(userStr11);
            const groupId = window.chatState.groupId;
            if (!confirm('Esti sigur ca vrei sa iesi din grup?')) { return; }
            try {
                const res = await fetch("http://localhost:5000/api/groups/" + groupId + "/leave", {
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: me.id })
                });
                if (res.ok) {
                    if (window.appSocket) { window.appSocket.emit('leaveGroupRoom', groupId); }
                    const overlay = document.getElementById('chat-overlay');
                    if (overlay) { overlay.classList.add('hidden'); }
                    window.chatState = null;
                    loadGroupsSection(JSON.parse(localStorage.getItem("user") || '{}'));
                }
            } catch (e){}
        });
    }
    // Trimitere mesaj
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');
    function sendChatMessage() {
        const text = chatInput ? chatInput.value.trim() : '';
        if (!text || !window.chatState || !window.appSocket) { return; }
        const userStr12 = localStorage.getItem("user");
        if (!userStr12) { return; }
        const me = JSON.parse(userStr12);
        if (window.chatState.type === 'dm') {
            window.appSocket.emit('sendDM', { senderId: me.id, receiverId: window.chatState.otherId, text: text });
        } else if (window.chatState.type === 'group') {
            window.appSocket.emit('sendGroupMsg', { senderId: me.id, groupId: window.chatState.groupId, text: text });
        }
        if (chatInput) { chatInput.value = ''; }
    }
    if (chatSendBtn) { chatSendBtn.addEventListener('click', sendChatMessage); }
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { sendChatMessage(); }
        });
    }
    // Formular creare grup
    const createGroupForm = document.getElementById('create-group-form');
    if (createGroupForm) {
        createGroupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const userStr13 = localStorage.getItem("user");
            if (!userStr13) { return; }
            const me = JSON.parse(userStr13);
            const name = document.getElementById('group-name').value.trim();
            const location = document.getElementById('group-location').value.trim();
            const dateTime = document.getElementById('group-date-time').value;
            const maxMembers = parseInt(document.getElementById('group-max-members').value) || 10;
            if (!name) { return; }
            try {
                const res = await fetch('http://localhost:5000/api/groups', {
                    method:'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ creatorId: me.id, name: name, location: location, dateTime: dateTime, maxMembers: maxMembers })
                });
                if (res.ok) {
                    const group = await res.json();
                    const modal2 = document.getElementById('create-group-modal');
                    if (modal2) { modal2.hidden = true; }
                    createGroupForm.reset();
                    loadGroupsSection(me);
                    openGroupChat(group._id, group.name, true);
                }
            } catch (e) {
                alert("Eroare la crearea grupului.");
            }
        });
    }
    window._openDMChat = openDMChat;
    window._openGroupChat = openGroupChat;
    // Buton follow din modalul de postare
    const modalFollowBtn = document.getElementById('modal-follow-btn');
    if (modalFollowBtn) {
        modalFollowBtn.addEventListener('click', async function() {
            const postId14 = viewPostModal ? viewPostModal.getAttribute('data-post-id') : null;
            if (!postId14) { return; }
            const post2 = window.postsArray.find(function(p) { return p._id === postId14; });
            if (!post2 || !post2.user) { return; }
            const authorId  = post2.user._id || post2.user;
            const userStr14 = localStorage.getItem("user");
            if (!userStr14) { alert("Trebuie sa fii logat!"); return; }
            const user = JSON.parse(userStr14);
            try {
                const res = await fetch("http://localhost:5000/api/auth/user/" + authorId + "/follow", {
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body:JSON.stringify({ followerId: user.id })
                });
                if (res.ok) {
                    const data = await res.json();
                    modalFollowBtn.textContent = data.isFollowing ? 'Urmaresti' : 'Urmarire';
                    modalFollowBtn.classList.toggle('following', data.isFollowing);
                }
            } catch (e){}
        });
    }
});
// leaderboard lunar
async function loadLeaderboard() {
    const sidebar = document.getElementById('leaderboard-sidebar');
    if (!sidebar) { return; }
    const monthEl = document.getElementById('leaderboard-month'); // Afisez luna curenta
    if (monthEl) {
        const now = new Date();
        monthEl.textContent = now.toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
    }
    try {
        const res = await fetch('http://localhost:5000/api/posts/leaderboard');
        if (!res.ok) { return; }
        const posts = await res.json();
        const header = sidebar.querySelector('h3');
        sidebar.innerHTML = '';
        if (header) { sidebar.appendChild(header); }

        if (posts.length === 0) {
            sidebar.insertAdjacentHTML('beforeend', '<p style="color:#aaa;text-align:center;font-size:0.85rem;padding:10px 0;">Nicio postare inca luna aceasta.</p>');
            return;
        }
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const thumb = (post.route && post.route.length > 0 && post.route[0].img)
                ? post.route[0].img
                : 'https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=60';
            const gems = post.monthlyGems || 0;
            const card = document.createElement('a');
            card.href      = '#';
            card.className = 'mini-card';
            card.setAttribute('data-post-id', post._id);
            card.innerHTML =
                '<span class="rank">#' + (i + 1) + '</span>' +
                '<img src="' + thumb + '" class="miniimage" alt="' + post.title + '">' +
                '<div class="scor">' +
                    '<span>' + post.title + '</span>' +
                    '<span>' + gems + ' 💎 Gems</span>' +
                '</div>';
            card.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.populateAndOpenModal) {
                    window.populateAndOpenModal(this.getAttribute('data-post-id'));
                }
            });
            sidebar.appendChild(card);
        }
    } catch (err) {
        console.error('Eroare leaderboard:', err);
    }
}
// lista dm-uri
async function loadDmList(currentUser) {
    const dmList = document.getElementById('dm-list');
    if (!dmList) { return; }
    try {
        // Cer datele userului curent si lista de useri in paralel
        const results = await Promise.all([
            fetch('http://localhost:5000/api/auth/users'),
            fetch('http://localhost:5000/api/auth/user/' + currentUser.id)
        ]);
        if (!results[0].ok || !results[1].ok) { return; }
        const users    = await results[0].json();
        const userData = await results[1].json();
        // Construiesc setul de conexiuni (urmaresc + ma urmaresc)
        const connectionIds = new Set(
            (userData.followingIds || []).concat(userData.followerIds || []).map(String)
        );
        dmList.innerHTML = '';
        // Pastrez doar userii cu care am o relatie de follow
        const others = [];
        for (let i = 0; i < users.length; i++) {
            const uid = String(users[i]._id);
            if (uid !== String(currentUser.id) && connectionIds.has(uid)) {
                others.push(users[i]);
            }
        }
        if (others.length === 0) {
            dmList.innerHTML = '<p style="color:#aaa;font-size:0.8rem;text-align:center;padding:10px;">Urmărește oameni ca să poți trimite mesaje.</p>';
            return;
        }
        for (let j = 0; j < others.length; j++) {
            const u      = others[j];
            const avatar = u.avatar || '';
            const div = document.createElement('div');
            div.className = 'dm-item';
            div.innerHTML = avHTML(avatar, 'avatar') +
                '<div class="dm-user-info">' +
                    '<span>' + u.username + '</span>' +
                    '<span>Apasa pentru a trimite mesaj</span>' +
                '</div>';
            // Closure ca sa captez corect variabilele u si avatar pentru fiecare iteratie
            (function(userId, username, userAvatar) {
                div.addEventListener('click', function() {
                    if (window._openDMChat) { window._openDMChat(userId, username, userAvatar); }
                });
            })(String(u._id), u.username, avatar);

            dmList.appendChild(div);
        }
    } catch (e) {
        console.error('loadDmList error:', e);
    }
}
// sectiunea de grupuri
async function loadGroupsSection(currentUser) {
    const container = document.getElementById('groups-container');
    if (!container) { return; }
    container.innerHTML = '';
    // Card pentru creare grup nou
    const createCard = document.createElement('div');
    createCard.className = 'create-group-card';
    createCard.textContent = '+ Creeaza grup';
    createCard.addEventListener('click', function() {
        const modal = document.getElementById('create-group-modal');
        if (modal) { modal.hidden = false; }
    });
    container.appendChild(createCard);
    try {
        const res = await fetch('http://localhost:5000/api/groups');
        if (!res.ok) { return; }
        const groups = await res.json();
        if (groups.length === 0) {
            container.insertAdjacentHTML('beforeend', '<p style="color:#aaa;font-size:0.8rem;text-align:center;padding:10px;">Niciun grup inca.</p>');
            return;
        }
        for (let i = 0; i < groups.length; i++) {
            renderGroupCard(groups[i], currentUser, container);
        }
    } catch (e) {
        console.error('loadGroupsSection error:', e);
    }
}
// Construieste si adauga un card de grup in container
function renderGroupCard(group, currentUser, container) {
    const isMember = false;// Verific daca userul curent e deja in grup
    if (group.members) {
        for (let i = 0; i < group.members.length; i++) {
            if (String(group.members[i]._id || group.members[i]) === String(currentUser.id)) {
                isMember = true;
                break;
            }
        }
    }
    const isFull = group.members && group.members.length >= group.maxMembers;
    const card = document.createElement('div');
    card.className = 'group-card';
    card.setAttribute('data-group-id', group._id);
    const dtDisplay = '';// Formatez data/ora pentru afisare
    if (group.dateTime) {
        try {
            dtDisplay = new Date(group.dateTime).toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' });
        } catch (e) {
            dtDisplay = group.dateTime;
        }
    }
    const headerHtml =
        '<div class="group-header">' +
            '<span>' + group.name + '</span>' +
            '<span>' + (group.location || '') + (dtDisplay ? ' • ' + dtDisplay : '') + '</span>' +
        '</div>';
    // Construiesc randurile cu avatarele membrilor
    const membersHtml = '<div class="group-body">';
    const membersToShow  = (group.members || []).slice(0, 5);
    for (let j = 0; j < membersToShow.length; j++) {
        const av = membersToShow[j].avatar || '';
        membersHtml += avHTML(av, 'avatar');
    }
    if (!isFull) {
        membersHtml += '<div class="empty-spot" data-group-id="' + group._id + '" data-group-name="' + group.name + '" data-is-member="' + isMember + '">+</div>';
    }
    membersHtml += '</div>';
    card.innerHTML = headerHtml + membersHtml;
    // Click pe "+"
    const emptySpot = card.querySelector('.empty-spot');
    if (emptySpot) {
        emptySpot.addEventListener('click', async function() {
            const userStrG = localStorage.getItem("user");
            if (!userStrG) { return; }
            const me = JSON.parse(userStrG);
            const gId = this.getAttribute('data-group-id');
            const gName = this.getAttribute('data-group-name');
            const alreadyMember = this.getAttribute('data-is-member') === 'true';
            if (!alreadyMember) {
                try {
                    const res = await fetch("http://localhost:5000/api/groups/" + gId + "/join", {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: me.id })
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        alert(err.message || "Nu te poti alatura grupului.");
                        return;
                    }
                    loadGroupsSection(me);
                } catch (e) {
                    alert("Eroare la alaturarea grupului.");
                    return;
                }
            }
            if (window._openGroupChat) { window._openGroupChat(gId, gName, true); }
        });
    }
    // Click pe card deschide chat daca esti deja membru
    card.addEventListener('click', function(e) {
        if (e.target.classList.contains('empty-spot')) { return; }
        if (isMember && window._openGroupChat) {
            window._openGroupChat(String(group._id), group.name, true);
        }
    });
    container.appendChild(card);
}
// carusel - apelat direct din HTML cu onclick
window.carouselState = {};
window.moveSlide = function(postId, direction, totalSlides) {
    if (window.carouselState[postId] === undefined) { window.carouselState[postId] = 0; }
    const currentIndex = window.carouselState[postId] + direction;
    if (currentIndex < 0)                { currentIndex = totalSlides - 1; }
    else if (currentIndex >= totalSlides) { currentIndex = 0; }
    window.goToSlide(postId, currentIndex, totalSlides);
};
window.goToSlide = function(postId, newIndex, totalSlides) {
    window.carouselState[postId] = newIndex;
    for (let i = 0; i < totalSlides; i++) {
        const img = document.getElementById("img-" + postId + "-" + i);
        const dot = document.getElementById("dot-" + postId + "-" + i);
        if (img) { img.style.display = (i === newIndex) ? "block" : "none"; }
        if (dot) {
            if (i === newIndex) { dot.classList.add("active"); }
            else { dot.classList.remove("active"); }
        }
    }
};