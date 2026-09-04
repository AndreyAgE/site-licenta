document.addEventListener("DOMContentLoaded", function() {
    window.postsArray = [];

    // sabloane html - le clonez in loc sa bag string-uri
    const postTpl = document.getElementById("post-card-template");
    const wpTpl = document.getElementById("waypoint-card-template");
    const commentTpl = document.getElementById("comment-template");
    const notifTpl = document.getElementById("notif-template");
    const dmTpl = document.getElementById("dm-item-template");
    const groupTpl = document.getElementById("group-card-template");
    const boardTpl = document.getElementById("leaderboard-card-template");

    const bigPost = document.getElementById("post-modal");
    const xBtn = document.getElementById("close-post-btn");
    if (xBtn && bigPost) {
        xBtn.addEventListener("click", function() {
            bigPost.classList.add("hidden");
        });
    }
    if (bigPost) {
        bigPost.addEventListener("click", function(e) {
            if (e.target === bigPost) { bigPost.classList.add("hidden"); }
        });
    }

    // cat timp a trecut de la o data
    function timeAgo(dateStr) {
        const diff = (Date.now() - new Date(dateStr)) / 1000;
        if (diff < 60) { return "acum"; }
        if (diff < 3600) { return Math.floor(diff / 60) + "m"; }
        if (diff < 86400) { return Math.floor(diff / 3600) + "h"; }
        return Math.floor(diff / 86400) + "z";
    }

    function getMe() {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    }

    function findPost(id) {
        return window.postsArray.find(function(p) { return p._id === id; });
    }

    // baga poza in img daca exista, altfel o ascunde
    function setPic(img, url) {
        if (!img) { return; }
        if (hasAvatar(url)) {
            img.src = url;
            img.classList.remove("av-hidden");
        } else {
            img.removeAttribute("src");
            img.classList.add("av-hidden");
        }
    }

    // un cerculet de avatar, pt liste cu numar variabil de useri (membri grup)
    function makeAvatarBit(url, imgCls) {
        const wrap = document.createElement("div");
        wrap.className = "av-wrap";
        const icon = document.createElement("i");
        icon.className = "fa-solid fa-user";
        wrap.appendChild(icon);
        const img = document.createElement("img");
        img.className = imgCls + " av-hidden";
        img.alt = "";
        wrap.appendChild(img);
        setPic(img, url);
        return wrap;
    }

    function setStatus(box, text, bad) {
        const p = document.createElement("p");
        p.style.cssText = bad
            ? "color:#ff6b6b;text-align:center;font-size:0.8rem;"
            : "color:#aaa;text-align:center;font-size:0.8rem;padding:20px 0;";
        p.textContent = text;
        box.replaceChildren(p);
    }

    // ---------- modal postare: harta + waypoints + comentarii ----------

    let wpCards = [];
    let wpMarkers = [];
    let viewMap = null;
    let hlTimer = null;

    // flash verde pe cardul de waypoint cand dai click pe marker
    function pingWp(idx) {
        const card = wpCards[idx];
        if (!card) { return; }
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        clearTimeout(hlTimer);
        wpCards.forEach(function(c) { c.style.outline = ""; });
        card.style.outline = "3px solid #4cd137";
        hlTimer = setTimeout(function() { card.style.outline = ""; }, 1500);
    }

    function fillWaypoints(post) {
        const box = document.getElementById("modal-waypoints");
        if (!box) { return; }
        box.replaceChildren();
        wpCards = [];

        const route = post.route || [];
        if (route.length === 0) {
            setStatus(box, "Niciun waypoint salvat.");
            return;
        }
        route.forEach(function(wp, i) {
            const node = wpTpl.content.cloneNode(true);
            const card = node.querySelector(".waypoint-card");
            const img = card.querySelector(".waypoint-card-img");
            if (wp.img) {
                img.src = wp.img;
                img.alt = wp.name;
                img.classList.remove("av-hidden");
            }
            card.querySelector(".waypoint-name").textContent = "📍 " + (i + 1) + ". " + wp.name;
            card.querySelector(".waypoint-desc").textContent = wp.desc || "";
            card.addEventListener("click", function() {
                const marker = wpMarkers[i];
                if (marker && viewMap) {
                    viewMap.setView(marker.getLatLng(), Math.max(viewMap.getZoom(), 14));
                    marker.openPopup();
                }
            });
            box.appendChild(card);
            wpCards.push(card);
        });
    }

    function drawMap(post) {
        const wrap = document.getElementById("modal-map-wrapper");
        if (viewMap) { viewMap.remove(); viewMap = null; }
        wpMarkers = [];
        if (wrap) {
            wrap.replaceChildren();
            const holder = document.createElement("div");
            holder.id = "view-map-container";
            holder.style.cssText = "width:100%;height:100%;";
            wrap.appendChild(holder);
        }

        viewMap = window.makeMap("view-map-container");

        const route = post.route || [];
        if (route.length > 0) {
            const pts = route.map(function(wp) { return [wp.lat, wp.lng]; });
            const line = L.polyline(pts, { color: "#4cd137", weight: 4 }).addTo(viewMap);

            route.forEach(function(wp, i) {
                const pop = document.createElement("div");
                const strong = document.createElement("b");
                strong.textContent = wp.name;
                pop.appendChild(strong);
                if (wp.desc) {
                    pop.appendChild(document.createElement("br"));
                    pop.appendChild(document.createTextNode(wp.desc));
                }
                const marker = L.marker([wp.lat, wp.lng]).addTo(viewMap).bindPopup(pop);
                marker.on("click", function() { pingWp(i); });
                wpMarkers.push(marker);
            });
            viewMap.fitBounds(line.getBounds());
        } else {
            viewMap.setView([45.94, 24.96], 7);
        }
        setTimeout(function() { if (viewMap) { viewMap.invalidateSize(); } }, 300);
    }

    function makeComment(c) {
        const node = commentTpl.content.cloneNode(true);
        const uname = c.user ? c.user.username : "Utilizator";
        setPic(node.querySelector(".avatar-micro"), c.user ? c.user.avatar : "");
        node.querySelector(".c-name").textContent = uname + ":";
        node.querySelector(".c-text").textContent = c.text;
        node.querySelector(".c-time").textContent = c.createdAt ? timeAgo(c.createdAt) : "acum";
        return node.querySelector(".comment-thread");
    }

    function fillComments(post) {
        const box = document.getElementById("modal-comments-section");
        if (!box) { return; }
        box.replaceChildren();

        const list = post.comments || [];
        if (list.length === 0) {
            const p = document.createElement("p");
            p.className = "comments-empty";
            p.style.cssText = "color:#aaa;text-align:center;padding:20px 0;";
            p.textContent = "Fii primul care comenteaza!";
            box.appendChild(p);
            return;
        }
        list.forEach(function(c) { box.appendChild(makeComment(c)); });
    }

    // populeaza modalul cu datele postarii si deschide harta traseului
    window.populateAndOpenModal = function populateAndOpenModal(postId) {
        const post = findPost(postId);
        if (!post || !bigPost) { return; }
        bigPost.setAttribute("data-post-id", postId);

        setPic(document.getElementById("modal-avatar"), post.user ? post.user.avatar : "");
        document.getElementById("modal-username").textContent = post.user ? post.user.username : "Utilizator Sters";
        document.getElementById("modal-location").textContent = "📍 " + post.title + " • " + post.difficulty + " • " + post.totalDistance;
        document.getElementById("modal-description").textContent = post.description || "";

        const gBtn = document.getElementById("modal-gem-btn");
        const gPicker = document.getElementById("gem-picker");
        if (gPicker) { gPicker.classList.add("hidden"); }
        if (gBtn) {
            gBtn.textContent = post.gems > 0 ? "💎 " + post.gems + " Gems" : "💎 Ofera Gem";
            gBtn.classList.toggle("gemmed", post.gems > 0);
        }

        const me = getMe();
        const likes = post.likes || [];
        const liked = !!(me && likes.some(function(id) { return String(id) === String(me.id); }));
        const lBtn = document.getElementById("modal-like-btn");
        if (lBtn) {
            lBtn.textContent = "❤️ " + likes.length + " Like" + (likes.length !== 1 ? "uri" : "");
            lBtn.classList.toggle("liked", liked);
        }

        fillComments(post);
        fillWaypoints(post);
        drawMap(post);

        bigPost.hidden = false;
        bigPost.classList.remove("hidden");

        // butonul de follow nu apare pe postarile proprii
        const followBtn = document.getElementById("modal-follow-btn");
        if (followBtn) {
            const authorId = post.user ? (post.user._id || post.user) : null;
            if (me && authorId && String(me.id) !== String(authorId)) {
                followBtn.style.display = "inline-block";
                followBtn.textContent = "Urmarire";
                followBtn.classList.remove("following");
            } else {
                followBtn.style.display = "none";
            }
        }
    };

    // like in modal
    const modalLikeBtn = document.getElementById("modal-like-btn");
    if (modalLikeBtn) {
        modalLikeBtn.addEventListener("click", async function() {
            const pid = bigPost.getAttribute("data-post-id");
            const me = getMe();
            if (!me) { alert("Trebuie sa fii logat!"); return; }
            try {
                const res = await fetch("http://localhost:5000/api/posts/" + pid + "/like", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: me.id })
                });
                if (!res.ok) { return; }
                const data = await res.json();
                modalLikeBtn.textContent = "❤️ " + data.likes + " Like" + (data.likes !== 1 ? "uri" : "");
                modalLikeBtn.classList.toggle("liked", data.liked);
                const post = findPost(pid);
                if (post) {
                    post.likes = post.likes || [];
                    if (data.liked) { post.likes.push(me.id); }
                    else { post.likes = post.likes.filter(function(id) { return String(id) !== String(me.id); }); }
                }
            } catch (err) {
                console.error("Eroare like:", err);
            }
        });
    }

    // gem picker din modal
    const gemBtn = document.getElementById("modal-gem-btn");
    const gemBox = document.getElementById("gem-picker");
    const gemLeftEl = document.getElementById("gem-picker-remaining");
    const gemNum = document.getElementById("gem-amount-input");
    const gemMinus = document.getElementById("gem-decrement");
    const gemPlus = document.getElementById("gem-increment");
    const gemGoBtn = document.getElementById("gem-confirm-btn");

    if (gemBtn && gemBox) {
        gemBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            const me = getMe();
            if (!me) { alert("Trebuie sa fii logat!"); return; }
            const bal = me.monthlyGems !== undefined ? me.monthlyGems : 0;
            gemLeftEl.textContent = bal;
            gemNum.value = 1;
            gemNum.max = bal;
            gemBox.classList.toggle("hidden");
        });
        gemMinus.addEventListener("click", function(e) {
            e.stopPropagation();
            const v = parseInt(gemNum.value) || 1;
            if (v > 1) { gemNum.value = v - 1; }
        });
        gemPlus.addEventListener("click", function(e) {
            e.stopPropagation();
            const me = getMe();
            const max = me ? (me.monthlyGems || 0) : 0;
            const v = parseInt(gemNum.value) || 1;
            if (v < max) { gemNum.value = v + 1; }
        });
        gemGoBtn.addEventListener("click", async function(e) {
            e.stopPropagation();
            const amount = parseInt(gemNum.value) || 0;
            if (amount < 1) { return; }
            const pid = bigPost.getAttribute("data-post-id");
            const me = getMe();
            if (!me) { alert("Trebuie sa fii logat!"); return; }
            if ((me.monthlyGems || 0) < amount) {
                alert("Nu ai destule gems! Ai " + (me.monthlyGems || 0) + " disponibili.");
                return;
            }
            try {
                const res = await fetch("http://localhost:5000/api/posts/" + pid + "/gem", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: me.id, amount: amount })
                });
                if (res.ok) {
                    const data = await res.json();
                    me.monthlyGems = data.remainingGems;
                    localStorage.setItem("user", JSON.stringify(me));
                    gemBtn.textContent = "💎 " + data.postGems + " Gems";
                    gemBtn.classList.add("gemmed");
                    gemBox.classList.add("hidden");
                    const leftEl = document.getElementById("gems-remaining");
                    if (leftEl) { leftEl.textContent = data.remainingGems; }
                    const fillEl = document.getElementById("gems-bar-fill");
                    if (fillEl) { fillEl.style.width = data.remainingGems + "%"; }
                    const post = findPost(pid);
                    if (post) {
                        post.gems = data.postGems;
                        post.monthlyGems = (post.monthlyGems || 0) + amount;
                    }
                    loadLeaderboard();
                } else {
                    const err = await res.json();
                    alert(err.message || "Eroare la trimiterea gems.");
                }
            } catch (err) {}
        });
        document.addEventListener("click", function(e) {
            if (gemBox && !gemBox.contains(e.target) && e.target !== gemBtn) {
                gemBox.classList.add("hidden");
            }
        });
    }

    // bara de gems din header, la incarcare
    (function() {
        const me = getMe();
        if (!me) { return; }
        const bal = me.monthlyGems !== undefined ? me.monthlyGems : 100;
        const leftEl = document.getElementById("gems-remaining");
        if (leftEl) { leftEl.textContent = bal; }
        const fillEl = document.getElementById("gems-bar-fill");
        if (fillEl) { fillEl.style.width = bal + "%"; }
    })();

    // comentariu nou in modal
    const commentInput = document.querySelector("#post-modal .comment-input");
    const commentBtn = document.querySelector("#post-modal .post-comment-btn");
    async function sendComment() {
        const text = commentInput.value.trim();
        if (!text) { return; }
        const pid = bigPost.getAttribute("data-post-id");
        const me = getMe();
        if (!me) { alert("Trebuie sa fii logat pentru a comenta!"); return; }
        try {
            const res = await fetch("http://localhost:5000/api/posts/" + pid + "/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: me.id, text: text })
            });
            if (!res.ok) { alert("Eroare la trimiterea comentariului."); return; }
            const newC = await res.json();
            commentInput.value = "";
            const box = document.getElementById("modal-comments-section");
            const empty = box.querySelector(".comments-empty");
            if (empty) { empty.remove(); }
            box.appendChild(makeComment(newC));
            const post = findPost(pid);
            if (post) {
                post.comments = post.comments || [];
                post.comments.push(newC);
            }
        } catch (err) {}
    }
    if (commentBtn && commentInput) {
        commentBtn.addEventListener("click", sendComment);
        commentInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter") { sendComment(); }
        });
    }

    // ---------- feed: cardurile de postare ----------

    function showSlide(box, idx) {
        box.dataset.slide = String(idx);
        box.querySelectorAll(".carousel-images img").forEach(function(img, i) {
            img.style.display = i === idx ? "block" : "none";
        });
        box.querySelectorAll(".dot").forEach(function(dot, i) {
            dot.classList.toggle("active", i === idx);
        });
    }
    function stepSlide(box, dir) {
        const total = box.querySelectorAll(".carousel-images img").length;
        let idx = parseInt(box.dataset.slide) + dir;
        if (idx < 0) { idx = total - 1; }
        else if (idx >= total) { idx = 0; }
        showSlide(box, idx);
    }

    function makeCard(post) {
        const node = postTpl.content.cloneNode(true);
        const box = node.querySelector(".post-container");
        box.dataset.id = post._id;
        box.dataset.slide = "0";

        box.querySelector(".card-username").textContent = post.user ? post.user.username : "Utilizator Sters";
        box.querySelector(".card-location").textContent = post.title + " • " + post.difficulty + " • " + post.totalDistance;
        box.querySelector(".description").textContent = post.description || "";
        setPic(box.querySelector(".top-post img"), post.user ? post.user.avatar : "");

        // poze din waypoints, sau una default daca traseul n-are nicio poza
        let pics = [];
        (post.route || []).forEach(function(wp) { if (wp.img) { pics.push(wp.img); } });
        if (pics.length === 0) {
            pics.push("https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80");
        }
        const imgBox = box.querySelector(".carousel-images");
        pics.forEach(function(src, i) {
            const pic = document.createElement("img");
            pic.className = "post-image trigger-modal";
            pic.alt = "Poza Traseu";
            pic.src = src;
            pic.style.display = i === 0 ? "block" : "none";
            imgBox.appendChild(pic);
        });
        if (pics.length > 1) {
            box.querySelector(".prev-btn").classList.remove("hidden");
            box.querySelector(".next-btn").classList.remove("hidden");
            const dotBox = box.querySelector(".carousel-dots");
            dotBox.classList.remove("hidden");
            pics.forEach(function(_, i) {
                const dot = document.createElement("span");
                dot.className = "dot" + (i === 0 ? " active" : "");
                dotBox.appendChild(dot);
            });
        }

        const me = getMe();
        const likes = post.likes || [];
        const liked = !!(me && likes.some(function(id) { return String(id) === String(me.id); }));
        const likeBtn = box.querySelector(".btn-like");
        likeBtn.textContent = "❤️ " + likes.length + " Like" + (likes.length !== 1 ? "uri" : "");
        likeBtn.classList.toggle("liked", liked);

        const gemBtnCard = box.querySelector(".btn-gem");
        gemBtnCard.textContent = post.gems > 0 ? "💎 " + post.gems + " Gems" : "💎 Ofera Gem";
        gemBtnCard.classList.toggle("gemmed", post.gems > 0);

        return box;
    }

    async function loadPosts() {
        if (!feedBox) { return; }
        try {
            const res = await fetch("http://localhost:5000/api/posts");
            const posts = await res.json();
            window.postsArray = posts;
            feedBox.replaceChildren();
            if (posts.length === 0) {
                const p = document.createElement("p");
                p.style.cssText = "color:white;text-align:center;";
                p.textContent = "Nu exista nicio postare inca.";
                feedBox.appendChild(p);
                return;
            }
            posts.forEach(function(post) { feedBox.appendChild(makeCard(post)); });
        } catch (err) {
            console.error("Eroare la fetch postari:", err);
        }
    }

    // picker de gems din feed - unul singur, il mut langa butonul apasat
    let openGemPostId = null;
    let openGemBtn = null;
    const feedGemBox = document.getElementById("feed-gem-picker");
    const feedGemNum = document.getElementById("feed-gem-input");
    const feedGemLeftEl = document.getElementById("feed-gem-remaining");

    function placeGemBox(trigger) {
        if (!feedGemBox) { return; }
        feedGemBox.style.visibility = "hidden";
        feedGemBox.style.bottom = "auto";
        feedGemBox.classList.remove("hidden");
        const rect = trigger.getBoundingClientRect();
        let top = rect.top - feedGemBox.offsetHeight - 8;
        let left = rect.left;
        if (top < 10) { top = rect.bottom + 8; }
        if (left + feedGemBox.offsetWidth > window.innerWidth - 10) { left = window.innerWidth - feedGemBox.offsetWidth - 10; }
        feedGemBox.style.top = top + "px";
        feedGemBox.style.left = left + "px";
        feedGemBox.style.visibility = "";
    }

    const feedBox = document.getElementById("feed-container");
    if (feedBox) {
        feedBox.addEventListener("click", async function(e) {
            const box = e.target.closest(".post-container");
            if (!box) { return; }
            const pid = box.dataset.id;

            if (e.target.closest(".prev-btn") || e.target.closest(".next-btn")) {
                stepSlide(box, e.target.closest(".prev-btn") ? -1 : 1);
                return;
            }
            if (e.target.classList.contains("dot")) {
                const dots = Array.from(box.querySelectorAll(".dot"));
                showSlide(box, dots.indexOf(e.target));
                return;
            }
            if (e.target.closest(".trigger-modal") || e.target.closest(".btn-comments")) {
                populateAndOpenModal(pid);
                return;
            }
            if (e.target.closest(".btn-like")) {
                const me = getMe();
                if (!me) { alert("Trebuie sa fii logat!"); return; }
                try {
                    const res = await fetch("http://localhost:5000/api/posts/" + pid + "/like", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: me.id })
                    });
                    if (!res.ok) { return; }
                    const data = await res.json();
                    const likeBtn = box.querySelector(".btn-like");
                    likeBtn.textContent = "❤️ " + data.likes + " Like" + (data.likes !== 1 ? "uri" : "");
                    likeBtn.classList.toggle("liked", data.liked);
                    const post = findPost(pid);
                    if (post) {
                        post.likes = post.likes || [];
                        post.likes = data.liked
                            ? post.likes.concat([me.id])
                            : post.likes.filter(function(id) { return String(id) !== String(me.id); });
                    }
                } catch (err) {
                    console.error("Eroare like feed:", err);
                }
                return;
            }
            if (e.target.closest(".btn-gem")) {
                e.stopPropagation();
                if (openGemPostId === pid && feedGemBox && !feedGemBox.classList.contains("hidden")) {
                    feedGemBox.classList.add("hidden");
                    openGemPostId = null;
                    openGemBtn = null;
                    return;
                }
                const me = getMe();
                if (!me) { alert("Trebuie sa fii logat!"); return; }
                openGemPostId = pid;
                openGemBtn = e.target.closest(".btn-gem");
                const bal = me.monthlyGems !== undefined ? me.monthlyGems : 0;
                if (feedGemLeftEl) { feedGemLeftEl.textContent = bal; }
                if (feedGemNum) { feedGemNum.value = 1; feedGemNum.max = bal; }
                placeGemBox(openGemBtn);
            }
        });
    }

    // butoane picker gems din feed: minus, plus, ofera
    const feedGemMinus = document.getElementById("feed-gem-dec");
    const feedGemPlus = document.getElementById("feed-gem-inc");
    const feedGemGoBtn = document.getElementById("feed-gem-confirm");
    if (feedGemMinus) {
        feedGemMinus.addEventListener("click", function(e) {
            e.stopPropagation();
            const v = parseInt(feedGemNum.value) || 1;
            if (v > 1) { feedGemNum.value = v - 1; }
        });
    }
    if (feedGemPlus) {
        feedGemPlus.addEventListener("click", function(e) {
            e.stopPropagation();
            const me = getMe();
            const max = me ? (me.monthlyGems || 0) : 0;
            const v = parseInt(feedGemNum.value) || 1;
            if (v < max) { feedGemNum.value = v + 1; }
        });
    }
    if (feedGemGoBtn) {
        feedGemGoBtn.addEventListener("click", async function(e) {
            e.stopPropagation();
            const amount = parseInt(feedGemNum ? feedGemNum.value : 0) || 0;
            if (amount < 1 || !openGemPostId) { return; }
            const me = getMe();
            if (!me) { alert("Trebuie sa fii logat!"); return; }
            if ((me.monthlyGems || 0) < amount) {
                alert("Nu ai destule gems! Ai " + (me.monthlyGems || 0) + " disponibili.");
                return;
            }
            const pid = openGemPostId;
            const btn = openGemBtn;
            try {
                const res = await fetch("http://localhost:5000/api/posts/" + pid + "/gem", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: me.id, amount: amount })
                });
                if (res.ok) {
                    const data = await res.json();
                    me.monthlyGems = data.remainingGems;
                    localStorage.setItem("user", JSON.stringify(me));
                    if (btn) { btn.textContent = "💎 " + data.postGems + " Gems"; btn.classList.add("gemmed"); }
                    if (feedGemBox) { feedGemBox.classList.add("hidden"); }
                    openGemPostId = null;
                    openGemBtn = null;
                    const leftEl = document.getElementById("gems-remaining");
                    if (leftEl) { leftEl.textContent = data.remainingGems; }
                    const fillEl = document.getElementById("gems-bar-fill");
                    if (fillEl) { fillEl.style.width = data.remainingGems + "%"; }
                    const post = findPost(pid);
                    if (post) {
                        post.gems = data.postGems;
                        post.monthlyGems = (post.monthlyGems || 0) + amount;
                    }
                    loadLeaderboard();
                } else {
                    const err = await res.json();
                    alert(err.message || "Eroare la trimiterea gems.");
                }
            } catch (err) {}
        });
    }
    document.addEventListener("click", function(e) {
        if (feedGemBox && !feedGemBox.classList.contains("hidden") &&
            !feedGemBox.contains(e.target) && !e.target.closest(".btn-gem")) {
            feedGemBox.classList.add("hidden");
            openGemPostId = null;
            openGemBtn = null;
        }
    });

    // publicare postare noua
    const postForm = document.getElementById("post-form");
    const createModal = document.getElementById("create-post-modal");
    if (postForm) {
        postForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const me = getMe();
            if (!me) { alert("Trebuie sa fii logat!"); return; }
            const title = document.getElementById("post-title").value;
            const desc = document.getElementById("post-description").value;
            const terrain = document.getElementById("post-terrain").value;
            const difficulty = document.getElementById("post-difficulty").value;
            const distEl = document.getElementById("stat-distance");
            const totalDistance = distEl ? distEl.textContent : "0 m";

            if (!window.waypoints || window.waypoints.length < 2) {
                alert("Adauga minim 2 puncte pe harta!");
                return;
            }
            const route = window.waypoints.map(function(wp) {
                return { lat: wp.lat, lng: wp.lng, name: wp.name, desc: wp.desc || "", img: wp.img || "" };
            });
            const body = {
                userId: me.id, title: title, description: desc,
                terrain: terrain, difficulty: difficulty,
                totalDistance: totalDistance, route: route
            };
            try {
                const res = await fetch("http://localhost:5000/api/posts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                if (res.ok) {
                    alert("Traseul a fost publicat cu succes!");
                    postForm.reset();
                    if (typeof window.clearRouteData === "function") { window.clearRouteData(); }
                    if (createModal) { createModal.hidden = true; }
                    loadPosts();
                } else {
                    const err = await res.json();
                    alert("Eroare: " + err.message);
                }
            } catch (err) {
                alert("Serverul nu raspunde. Asigura-te ca node server.js ruleaza.");
            }
        });
    }

    loadPosts();
    loadLeaderboard();

    // ---------- socket.io: notificari si mesagerie live ----------

    let socket = null;
    let chatState = null;
    const me0 = getMe();

    function makeNotif(n) {
        const node = notifTpl.content.cloneNode(true);
        const item = node.querySelector(".notif-item");
        setPic(item.querySelector(".avatar-micro"), n.sender ? n.sender.avatar : "");
        item.querySelector(".notif-text").textContent = window.notifText(n);
        if (window.attachNotifClick) { window.attachNotifClick(item, n); }
        return item;
    }

    if (me0 && typeof io !== "undefined") {
        socket = io("http://localhost:5000");
        socket.on("connect", function() { socket.emit("join", me0.id); });

        socket.on("notification", function(n) {
            const badge = document.querySelector("#btn-notifications .badge");
            if (badge) { badge.textContent = (parseInt(badge.textContent) || 0) + 1; }
            const menu = document.getElementById("dropdown-notifications");
            if (menu && !menu.classList.contains("hidden")) {
                const item = makeNotif(n);
                const head = menu.querySelector("h4");
                if (head) { head.after(item); } else { menu.prepend(item); }
            }
        });
        socket.on("receiveDM", function(msg) {
            if (chatState && chatState.type === "dm") {
                const sid = String(msg.sender._id || msg.sender);
                if (sid === String(chatState.otherId) || sid === String(me0.id)) {
                    addMsg(msg, sid === String(me0.id));
                }
            }
        });
        socket.on("receiveGroupMsg", function(data) {
            if (chatState && chatState.type === "group" && String(chatState.groupId) === String(data.groupId)) {
                addMsg(data.msg, String(data.msg.sender._id || data.msg.sender) === String(me0.id));
            }
        });

        fetch("http://localhost:5000/api/notifications/" + me0.id)
            .then(function(r) { return r.json(); })
            .then(function(list) {
                const badge = document.querySelector("#btn-notifications .badge");
                if (badge) { badge.textContent = list.length > 0 ? list.length : ""; }
                const menu = document.getElementById("dropdown-notifications");
                if (!menu) { return; }
                const head = menu.querySelector("h4");
                menu.replaceChildren();
                if (head) { menu.appendChild(head); }
                if (list.length === 0) {
                    const p = document.createElement("p");
                    p.style.cssText = "color:#aaa;text-align:center;padding:15px;font-size:0.85rem;";
                    p.textContent = "Nicio notificare noua.";
                    menu.appendChild(p);
                } else {
                    list.forEach(function(n) { menu.appendChild(makeNotif(n)); });
                }
                const btn = document.getElementById("btn-notifications");
                if (btn) {
                    btn.addEventListener("click", async function() {
                        await fetch("http://localhost:5000/api/notifications/read-all/" + me0.id, { method: "PUT" });
                        setTimeout(function() { if (badge) { badge.textContent = ""; } }, 500);
                    }, { once: true });
                }
            })
            .catch(function() {});

        loadDmList(me0);
        loadGroupsSection(me0);
    }

    // adauga un mesaj in panoul de chat
    function addMsg(msg, mine) {
        const box = document.getElementById("chat-messages");
        if (!box) { return; }
        const div = document.createElement("div");
        div.className = "chat-msg " + (mine ? "mine" : "theirs");
        const sender = msg.sender ? (msg.sender.username || "") : "";
        if (!mine && sender) {
            const nameEl = document.createElement("span");
            nameEl.className = "chat-msg-sender";
            nameEl.textContent = sender;
            div.appendChild(nameEl);
        }
        const bubble = document.createElement("span");
        bubble.className = "chat-bubble";
        bubble.textContent = msg.text;
        div.appendChild(bubble);
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }

    // deschide chat cu un alt utilizator
    async function openDM(otherId, otherName) {
        const me = getMe();
        if (!me) { return; }
        chatState = { type: "dm", otherId: otherId, otherName: otherName };
        const titleEl = document.getElementById("chat-title");
        if (titleEl) { titleEl.textContent = otherName; }
        const leaveBtn = document.getElementById("leave-group-btn");
        if (leaveBtn) { leaveBtn.classList.add("hidden"); }
        const box = document.getElementById("chat-messages");
        if (box) { setStatus(box, "Se incarca..."); }
        const overlay = document.getElementById("chat-overlay");
        if (overlay) { overlay.classList.remove("hidden"); }
        try {
            const res = await fetch("http://localhost:5000/api/messages/dm/" + me.id + "/" + otherId);
            const msgs = await res.json();
            if (box) {
                box.replaceChildren();
                if (msgs.length === 0) { setStatus(box, "Niciun mesaj inca. Spune salut! 👋"); }
                else { msgs.forEach(function(m) { addMsg(m, String(m.sender._id || m.sender) === String(me.id)); }); }
            }
        } catch (e) {
            if (box) { setStatus(box, "Eroare la incarcarea mesajelor.", true); }
        }
    }

    // deschide chat de grup
    async function openGroupChat(groupId, groupName, isMember) {
        const me = getMe();
        if (!me) { return; }
        chatState = { type: "group", groupId: groupId, groupName: groupName };
        if (socket) { socket.emit("joinGroupRoom", groupId); }
        const titleEl = document.getElementById("chat-title");
        if (titleEl) { titleEl.textContent = groupName; }
        const leaveBtn = document.getElementById("leave-group-btn");
        if (leaveBtn) { leaveBtn.classList.toggle("hidden", !isMember); }
        const box = document.getElementById("chat-messages");
        if (box) { setStatus(box, "Se incarca..."); }
        const overlay = document.getElementById("chat-overlay");
        if (overlay) { overlay.classList.remove("hidden"); }
        try {
            const res = await fetch("http://localhost:5000/api/messages/group/" + groupId);
            const msgs = await res.json();
            if (box) {
                box.replaceChildren();
                if (msgs.length === 0) { setStatus(box, "Niciun mesaj inca."); }
                else { msgs.forEach(function(m) { addMsg(m, String(m.sender._id || m.sender) === String(me.id)); }); }
            }
        } catch (e) {
            if (box) { setStatus(box, "Eroare la incarcarea mesajelor.", true); }
        }
    }

    const closeChatBtn = document.getElementById("close-chat-btn");
    if (closeChatBtn) {
        closeChatBtn.addEventListener("click", function() {
            const overlay = document.getElementById("chat-overlay");
            if (overlay) { overlay.classList.add("hidden"); }
            if (chatState && chatState.type === "group" && socket) {
                socket.emit("leaveGroupRoom", chatState.groupId);
            }
            chatState = null;
        });
    }

    const leaveGroupBtn = document.getElementById("leave-group-btn");
    if (leaveGroupBtn) {
        leaveGroupBtn.addEventListener("click", async function() {
            const me = getMe();
            if (!me || !chatState || chatState.type !== "group") { return; }
            const groupId = chatState.groupId;
            if (!confirm("Esti sigur ca vrei sa iesi din grup?")) { return; }
            try {
                const res = await fetch("http://localhost:5000/api/groups/" + groupId + "/leave", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: me.id })
                });
                if (res.ok) {
                    if (socket) { socket.emit("leaveGroupRoom", groupId); }
                    const overlay = document.getElementById("chat-overlay");
                    if (overlay) { overlay.classList.add("hidden"); }
                    chatState = null;
                    loadGroupsSection(getMe());
                }
            } catch (e) {}
        });
    }

    const chatSendBtn = document.getElementById("chat-send-btn");
    const chatInput = document.getElementById("chat-input");
    function sendMsg() {
        const text = chatInput ? chatInput.value.trim() : "";
        if (!text || !chatState || !socket) { return; }
        const me = getMe();
        if (!me) { return; }
        if (chatState.type === "dm") {
            socket.emit("sendDM", { senderId: me.id, receiverId: chatState.otherId, text: text });
        } else if (chatState.type === "group") {
            socket.emit("sendGroupMsg", { senderId: me.id, groupId: chatState.groupId, text: text });
        }
        if (chatInput) { chatInput.value = ""; }
    }
    if (chatSendBtn) { chatSendBtn.addEventListener("click", sendMsg); }
    if (chatInput) {
        chatInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter") { sendMsg(); }
        });
    }

    // ---------- leaderboard, dm-uri, grupuri ----------

    async function loadLeaderboard() {
        const box = document.getElementById("leaderboard-sidebar");
        if (!box) { return; }
        const monthEl = document.getElementById("leaderboard-month");
        if (monthEl) { monthEl.textContent = new Date().toLocaleString("ro-RO", { month: "long", year: "numeric" }); }
        try {
            const res = await fetch("http://localhost:5000/api/posts/leaderboard");
            if (!res.ok) { return; }
            const posts = await res.json();
            const head = box.querySelector("h3");
            box.replaceChildren();
            if (head) { box.appendChild(head); }

            if (posts.length === 0) {
                const p = document.createElement("p");
                p.style.cssText = "color:#aaa;text-align:center;font-size:0.85rem;padding:10px 0;";
                p.textContent = "Nicio postare inca luna aceasta.";
                box.appendChild(p);
                return;
            }
            posts.forEach(function(post, i) {
                const node = boardTpl.content.cloneNode(true);
                const card = node.querySelector(".mini-card");
                card.dataset.postId = post._id;
                card.querySelector(".rank").textContent = "#" + (i + 1);
                const thumb = (post.route && post.route[0] && post.route[0].img)
                    ? post.route[0].img
                    : "https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=60";
                const img = card.querySelector(".miniimage");
                img.src = thumb;
                img.alt = post.title;
                card.querySelector(".lb-title").textContent = post.title;
                card.querySelector(".lb-gems").textContent = (post.monthlyGems || 0) + " 💎 Gems";
                card.addEventListener("click", function(e) {
                    e.preventDefault();
                    if (window.populateAndOpenModal) { window.populateAndOpenModal(post._id); }
                });
                box.appendChild(card);
            });
        } catch (err) {
            console.error("Eroare leaderboard:", err);
        }
    }

    async function loadDmList(me) {
        const box = document.getElementById("dm-list");
        if (!box) { return; }
        try {
            const results = await Promise.all([
                fetch("http://localhost:5000/api/auth/users"),
                fetch("http://localhost:5000/api/auth/user/" + me.id)
            ]);
            if (!results[0].ok || !results[1].ok) { return; }
            const users = await results[0].json();
            const myData = await results[1].json();
            const known = new Set((myData.followingIds || []).concat(myData.followerIds || []).map(String));
            box.replaceChildren();

            const others = users.filter(function(u) {
                return String(u._id) !== String(me.id) && known.has(String(u._id));
            });
            if (others.length === 0) {
                const p = document.createElement("p");
                p.style.cssText = "color:#aaa;font-size:0.8rem;text-align:center;padding:10px;";
                p.textContent = "Urmărește oameni ca să poți trimite mesaje.";
                box.appendChild(p);
                return;
            }
            others.forEach(function(u) {
                const node = dmTpl.content.cloneNode(true);
                const item = node.querySelector(".dm-item");
                setPic(item.querySelector("img"), u.avatar || "");
                item.querySelector(".dm-name").textContent = u.username;
                item.addEventListener("click", function() { openDM(String(u._id), u.username); });
                box.appendChild(item);
            });
        } catch (e) {
            console.error("loadDmList error:", e);
        }
    }

    async function loadGroupsSection(me) {
        const box = document.getElementById("groups-container");
        if (!box) { return; }
        box.replaceChildren();

        const addCard = document.createElement("div");
        addCard.className = "create-group-card";
        addCard.textContent = "+ Creeaza grup";
        addCard.addEventListener("click", function() {
            const modal = document.getElementById("create-group-modal");
            if (modal) { modal.hidden = false; }
        });
        box.appendChild(addCard);

        try {
            const res = await fetch("http://localhost:5000/api/groups");
            if (!res.ok) { return; }
            const groups = await res.json();
            if (groups.length === 0) {
                const p = document.createElement("p");
                p.style.cssText = "color:#aaa;font-size:0.8rem;text-align:center;padding:10px;";
                p.textContent = "Niciun grup inca.";
                box.appendChild(p);
                return;
            }
            groups.forEach(function(g) { makeGroupCard(g, me, box); });
        } catch (e) {
            console.error("loadGroupsSection error:", e);
        }
    }

    function makeGroupCard(group, me, box) {
        const isMember = (group.members || []).some(function(m) {
            return String(m._id || m) === String(me.id);
        });
        const isFull = group.members && group.members.length >= group.maxMembers;

        const node = groupTpl.content.cloneNode(true);
        const card = node.querySelector(".group-card");
        card.dataset.groupId = group._id;
        card.querySelector(".g-name").textContent = group.name;

        let when = "";
        if (group.dateTime) {
            try { when = new Date(group.dateTime).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }); }
            catch (e) { when = group.dateTime; }
        }
        card.querySelector(".g-meta").textContent = (group.location || "") + (when ? " • " + when : "");

        const body = card.querySelector(".group-body");
        (group.members || []).slice(0, 5).forEach(function(m) {
            body.appendChild(makeAvatarBit(m.avatar || "", "avatar"));
        });
        if (!isFull) {
            const plus = document.createElement("div");
            plus.className = "empty-spot";
            plus.textContent = "+";
            plus.addEventListener("click", async function() {
                const meNow = getMe();
                if (!meNow) { return; }
                if (!isMember) {
                    try {
                        const res = await fetch("http://localhost:5000/api/groups/" + group._id + "/join", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: meNow.id })
                        });
                        if (!res.ok) {
                            const err = await res.json();
                            alert(err.message || "Nu te poti alatura grupului.");
                            return;
                        }
                        loadGroupsSection(meNow);
                    } catch (e) {
                        alert("Eroare la alaturarea grupului.");
                        return;
                    }
                }
                openGroupChat(group._id, group.name, true);
            });
            body.appendChild(plus);
        }
        card.addEventListener("click", function(e) {
            if (e.target.classList.contains("empty-spot")) { return; }
            if (isMember) { openGroupChat(String(group._id), group.name, true); }
        });
        box.appendChild(card);
    }

    // formular creare grup
    const createGroupForm = document.getElementById("create-group-form");
    if (createGroupForm) {
        createGroupForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const me = getMe();
            if (!me) { return; }
            const name = document.getElementById("group-name").value.trim();
            const location = document.getElementById("group-location").value.trim();
            const dateTime = document.getElementById("group-date-time").value;
            const maxMembers = parseInt(document.getElementById("group-max-members").value) || 10;
            if (!name) { return; }
            try {
                const res = await fetch("http://localhost:5000/api/groups", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ creatorId: me.id, name: name, location: location, dateTime: dateTime, maxMembers: maxMembers })
                });
                if (res.ok) {
                    const group = await res.json();
                    const modal = document.getElementById("create-group-modal");
                    if (modal) { modal.hidden = true; }
                    createGroupForm.reset();
                    loadGroupsSection(me);
                    openGroupChat(group._id, group.name, true);
                }
            } catch (e) {
                alert("Eroare la crearea grupului.");
            }
        });
    }

    // buton follow din modalul de postare
    const modalFollowBtn = document.getElementById("modal-follow-btn");
    if (modalFollowBtn) {
        modalFollowBtn.addEventListener("click", async function() {
            const pid = bigPost ? bigPost.getAttribute("data-post-id") : null;
            if (!pid) { return; }
            const post = findPost(pid);
            if (!post || !post.user) { return; }
            const authorId = post.user._id || post.user;
            const me = getMe();
            if (!me) { alert("Trebuie sa fii logat!"); return; }
            try {
                const data = await window.sendFollow(authorId, me.id);
                if (data) {
                    modalFollowBtn.textContent = data.isFollowing ? "Urmaresti" : "Urmarire";
                    modalFollowBtn.classList.toggle("following", data.isFollowing);
                }
            } catch (e) {}
        });
    }
});
