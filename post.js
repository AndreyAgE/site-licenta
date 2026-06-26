document.addEventListener("DOMContentLoaded", function() {
    var btnPostare = document.getElementById("btn-postare");
    // dropdown notificari
    var btnNotifications = document.getElementById("btn-notifications");
    var dropdownNotifications = document.getElementById("dropdown-notifications");
    // dropdown-ul profil
    var btnProfile = document.getElementById("btn-profile");
    var dropdownProfile = document.getElementById("dropdown-profile");
    // Modalul care se deschide cand userul da click pe o postare din feed
    var viewPostModal = document.getElementById("post-modal");
    var closeViewPostBtn = document.getElementById("close-post-btn");
    var feedPosts = document.querySelectorAll(".post-image, .grid-item img");
    // Butonul care arata/ascunde harta in formularul de postare
    var btnMap = document.querySelector(".btn-map");
    // Creez dinamic containerul pentru harta (nu il pun in HTML ca sa fie creat doar la nevoie)
    var mapContainer = document.createElement("div");
    mapContainer.id = "create-map-container";
    mapContainer.style.display = "none";
    mapContainer.style.width = "100%";
    mapContainer.style.height = "200px";
    mapContainer.style.borderRadius = "10px";
    mapContainer.style.marginTop = "10px";
    mapContainer.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    mapContainer.style.zIndex = "10";
    // Il inserez chiar dupa grupul de location din formular
    var locationGroup = document.querySelector(".location-group");
    if (locationGroup) {
        locationGroup.parentNode.insertBefore(mapContainer, locationGroup.nextSibling);
    }
    // Variabile pentru harta
    var createMap = null;
    var waypoints = [];
    var routePolyline = null;
    // Formula Haversine - calculeaza distanta dintre 2 puncte GPS pe sfera
    function haversineMeters(lat1, lng1, lat2, lng2) {
        var R = 6371000; // raza Pamantului in metri
        // Transform gradele in radiani
        var lat1Rad = lat1 * Math.PI / 180;
        var lat2Rad = lat2 * Math.PI / 180;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        // Aplicarea formulei
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    // Cand userul adauga un waypoint, afisez in input cate puncte are si distanta totala
    function updateLocationInput() {
        var input = document.getElementById("nume-locatie");
        if (!input) {
            return;
        }
        // Daca nu sunt puncte, golesc input-ul
        if (waypoints.length === 0) {
            input.value = "";
            return;
        }
        // Calculez distanta totala
        var totalDist = 0;
        for (var i = 1; i < waypoints.length; i++) {
            var p1 = waypoints[i - 1];
            var p2 = waypoints[i];
            totalDist = totalDist + haversineMeters(p1.lat, p1.lng, p2.lat, p2.lng);
        }
        var km = (totalDist / 1000).toFixed(2);
        input.value = waypoints.length + " puncte | " + km + " km";
    }
    // Click pe butonul de harta - arata/ascunde harta
    if (btnMap) {
        btnMap.addEventListener("click", function() {
            if (mapContainer.style.display === "none") {
                mapContainer.style.display = "block";
                if (createMap == null) {
                    createMap = L.map("create-map-container").setView([45.9432, 24.9668], 7);
                    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { 
                        maxZoom: 19 
                    }).addTo(createMap);
                    createMap.on("click", function(e) {
                        var lat = e.latlng.lat;
                        var lng = e.latlng.lng;
                        var marker = L.marker([lat, lng]).addTo(createMap);
                        waypoints.push({ 
                            lat: lat, 
                            lng: lng, 
                            marker: marker 
                        });
                        if (routePolyline) {
                            createMap.removeLayer(routePolyline);
                        }
                        var latlngs = [];
                        for (var i = 0; i < waypoints.length; i++) {
                            latlngs.push([waypoints[i].lat, waypoints[i].lng]);
                        }
                        routePolyline = L.polyline(latlngs, { 
                            color: "#4cd137", 
                            weight: 4 
                        }).addTo(createMap);
                        updateLocationInput();
                    });
                }
                setTimeout(function() { 
                    createMap.invalidateSize(); 
                }, 100);

            } else {
                mapContainer.style.display = "none";
            }
        });
    }
    // Dropdown notificari - click pe clopotel
    if (btnNotifications && dropdownNotifications) {
        btnNotifications.addEventListener("click", function(e) {
            e.stopPropagation();
            dropdownNotifications.classList.toggle("hidden");
            if (dropdownProfile) {
                dropdownProfile.classList.add("hidden");
            }
        });
    }
    // Dropdown profil - click pe avatar
    if (btnProfile && dropdownProfile) {
        btnProfile.addEventListener("click", function(e) {
            e.stopPropagation();
            dropdownProfile.classList.toggle("hidden");
            if (dropdownNotifications) {
                dropdownNotifications.classList.add("hidden");
            }
        });
    }
    // Click pe o poza din feed - deschid modalul cu postarea
    if (feedPosts.length > 0 && viewPostModal) {
        for (var k = 0; k < feedPosts.length; k++) {
            feedPosts[k].addEventListener("click", function() {
                viewPostModal.classList.remove("hidden");
            });
        }
    }
    // Inchidere modal postare (butonul X)
    if (closeViewPostBtn && viewPostModal) {
        closeViewPostBtn.addEventListener("click", function() {
            viewPostModal.classList.add("hidden");
        });
    }
    // Click pe document - inchid dropdown-urile si modal-urile daca s-a dat click in afara lor
    document.addEventListener("click", function(e) {
        // Inchid dropdown-ul de notificari daca click-ul e in afara lui
        if (dropdownNotifications && !dropdownNotifications.contains(e.target) && !btnNotifications.contains(e.target)) {
            dropdownNotifications.classList.add("hidden");
        }
        // La fel pentru dropdown-ul de profil
        if (dropdownProfile && !dropdownProfile.contains(e.target) && !btnProfile.contains(e.target)) {
            dropdownProfile.classList.add("hidden");
        }
        // Click pe fundalul overlay-ului de postare -> inchidere
        if (overlayPostare && e.target === overlayPostare) {
            overlayPostare.classList.add("hidden");
        }
        // Click pe fundalul modalului de postare -> inchidere
        if (viewPostModal && e.target === viewPostModal) {
            viewPostModal.classList.add("hidden");
        }
    });
});