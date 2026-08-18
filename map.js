document.addEventListener("DOMContentLoaded", function() {
    var btnPostare = document.getElementById("btn-postare");
    var postModal = document.getElementById("create-post-modal");
    var waypointModal = document.getElementById("waypoint-modal");
    var waypointForm = document.getElementById("waypoint-form");
    var createMap = null;
    window.waypoints = []; // lista cu toate punctele adaugate
    var routePolyline = null; // linia care uneste punctele
    var pendingWaypoint = null; // punctul pe care urmeaza sa il salvez
    // Marker temporar pentru geocoding
    var searchMarker = null;
    function placeSearchMarker(lat, lng, label) {
        if (searchMarker) { createMap.removeLayer(searchMarker); }
        searchMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'search-result-marker',
                html: '<div style="background:#e67e22;color:white;padding:3px 8px;border-radius:12px;font-size:0.75rem;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4)">' + label + '</div>',
                iconAnchor: [0, 10]
            })
        }).addTo(createMap);
    }
    // Geocoding cu Nominatim
    function geocodeAndFly(q) {
        var btn = document.getElementById('map-search-btn');
        if (btn) { btn.disabled = true; }
        var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q);
        fetch(url, { headers: { 'Accept-Language': 'ro' } })
            .then(function(r) { return r.json(); })
            .then(function(results) {
                if (btn) { btn.disabled = false; }
                if (!results || results.length === 0) {
                    alert('Locatia nu a fost gasita. Incearca un alt termen.');
                    return;
                }
                var r = results[0];
                var lat = parseFloat(r.lat);
                var lng = parseFloat(r.lon);
                var label = r.display_name.split(',')[0];
                createMap.flyTo([lat, lng], 14, { duration: 1.2 });
                placeSearchMarker(lat, lng, label);
            })
            .catch(function() {
                if (btn) { btn.disabled = false; }
                alert('Eroare la cautare. Verifica conexiunea.');
            });
    }
    // Locatia curenta cu Geolocation
    function flyToCurrentLocation() {
        var btn = document.getElementById('map-geo-btn');
        if (!navigator.geolocation) {
            alert('Browserul tau nu suporta geolocatie.');
            return;
        }
        if (btn) { btn.classList.add('loading'); }
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                if (btn) { btn.classList.remove('loading'); }
                var lat = pos.coords.latitude;
                var lng = pos.coords.longitude;
                createMap.flyTo([lat, lng], 15, { duration: 1.2 });
                placeSearchMarker(lat, lng, 'Locatia mea');
            },
            function() {
                if (btn) { btn.classList.remove('loading'); }
                alert('Nu s-a putut obtine locatia. Verifica permisiunile browserului.');
            },
            { timeout: 10000 }
        );
    }
    // Functia care initializeaza harta cand userul deschide modalul de postare
    window.initCreateMap = function() {
        if (createMap == null) {
            createMap = L.map("map-container").setView([45.9432, 24.9668], 7);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19
            }).addTo(createMap);
            createMap.on("click", function(e) {
                pendingWaypoint = {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng
                };
                document.getElementById("wp-name").value = "";
                document.getElementById("wp-description").value = "";
                document.getElementById("wp-image").value = "";
                document.getElementById("wp-image-preview").hidden = true;
                document.getElementById("wp-image-preview").src = "";
                window.openModal(waypointModal);
            });
            // Bara de cautare geocoding
            var searchInput = document.getElementById('map-search-input');
            var searchBtn = document.getElementById('map-search-btn');
            var geoBtn = document.getElementById('map-geo-btn');
            if (searchBtn) {
                searchBtn.addEventListener('click', function() {
                    var q = searchInput ? searchInput.value.trim() : '';
                    if (q.length > 1) { geocodeAndFly(q); }
                });
            }
            if (searchInput) {
                searchInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        var q = searchInput.value.trim();
                        if (q.length > 1) { geocodeAndFly(q); }
                    }
                });
            }
            if (geoBtn) {
                geoBtn.addEventListener('click', flyToCurrentLocation);
            }
        }
        setTimeout(function() {
            createMap.invalidateSize();
        }, 300);
    };
    // buton postare noua
    if (btnPostare) {
        btnPostare.addEventListener("click", function(e) {
            e.preventDefault();
            window.openModal(postModal);
            window.initCreateMap();
        });
    }
    // Preview pentru imaginea atasata la waypoint
    var wpImageInput = document.getElementById("wp-image");
    if (wpImageInput) {
        wpImageInput.addEventListener("change", function(e) {
            var file = e.target.files[0];
            var preview = document.getElementById("wp-image-preview");
            if (file) {
                // fileReader-base64 pentru preview
                var reader = new FileReader();
                reader.onload = function(event) {
                    preview.src = event.target.result;
                    preview.hidden = false;
                };
                reader.readAsDataURL(file);
            } else {
                preview.hidden = true;
                preview.src = "";
            }
        });
    }
    // Creez un marker numerotat
    function numberIcon(n) {
        var html = '<div style="background:#4cd137;color:white;width:30px;height:30px;';
        html += 'border-radius:50%;display:flex;align-items:center;justify-content:center;';
        html += 'font-weight:bold;border:2px solid white;';
        html += 'box-shadow:0 2px 6px rgba(0,0,0,0.4)">' + n + '</div>';
        return L.divIcon({
            className: "numbermarker",
            html: html,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }
    // Formula Haversine
    function haversineMeters(lat1, lng1, lat2, lng2) {
        var R = 6371000; 
        // Convertesc gradele in radiani
        var lat1Rad = lat1 * Math.PI / 180;
        var lat2Rad = lat2 * Math.PI / 180;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    // statisticile afisate
    function updateRouteStats() {
        var statPoints = document.getElementById("stat-points");
        if (statPoints) {
            statPoints.textContent = window.waypoints.length;
        }
        // Calculez distanta totala adunand distantele dintre puncte consecutive
        var totalDist = 0;
        for (var i = 1; i < window.waypoints.length; i++) {
            var p1 = window.waypoints[i - 1];
            var p2 = window.waypoints[i];
            totalDist = totalDist + haversineMeters(p1.lat, p1.lng, p2.lat, p2.lng);
        }
        // Daca e sub 1 km afisez in metri, altfel in km
        var distText;
        if (totalDist < 1000) {
            distText = Math.round(totalDist) + " m";
        } else {
            distText = (totalDist / 1000).toFixed(2) + " km";
        }
        var statDistance = document.getElementById("stat-distance");
        if (statDistance) {
            statDistance.textContent = distText;
        }
        // Refac lista cu numele waypoint-urilor
        var wpList = document.getElementById("waypoint-list");
        if (wpList) {
            wpList.innerHTML = "";
            for (var j = 0; j < window.waypoints.length; j++) {
                var li = document.createElement("li");
                li.textContent = (j + 1) + ". " + window.waypoints[j].name;
                wpList.appendChild(li);
            }
        }
    }
    // Desenez linia care uneste toate punctele
    function drawRoute() {
        // Sterg linia veche daca exista (altfel se suprapun)
        if (routePolyline != null) {
            createMap.removeLayer(routePolyline);
        }
        // Construiesc array-ul de coordonate pentru polyline
        var latlngs = [];
        for (var i = 0; i < window.waypoints.length; i++) {
            latlngs.push([window.waypoints[i].lat, window.waypoints[i].lng]);
        }
        routePolyline = L.polyline(latlngs, { 
            color: "#4cd137", 
            weight: 4 
        }).addTo(createMap);
    }
    // Cand userul completeaza formularul pentru un waypoint nou
    if (waypointForm) {
        waypointForm.addEventListener("submit", function(e) {
            e.preventDefault();
            if (!pendingWaypoint) {
                return;
            }
            var name = document.getElementById("wp-name").value;
            var desc = document.getElementById("wp-description").value;
            var imgPreview = document.getElementById("wp-image-preview").src;
            var hasImage = !document.getElementById("wp-image-preview").hidden;
            // Adaug marker-ul pe harta (draggable = poate fi mutat dupa plasare)
            var marker = L.marker([pendingWaypoint.lat, pendingWaypoint.lng], {
                icon: numberIcon(window.waypoints.length + 1),
                draggable: true
            }).addTo(createMap);
            // Construiesc continutul popup-ului
            var popupContent = "<strong>" + name + "</strong>";
            if (desc) {
                popupContent = popupContent + "<br>" + desc;
            }
            if (hasImage && imgPreview) {
                popupContent = popupContent + '<br><img src="' + imgPreview + 
                    '" style="max-width:150px;border-radius:5px;margin-top:5px;">';
            }
            marker.bindPopup(popupContent);
            // Salvez waypoint-ul in array
            var wpIndex = window.waypoints.length;
            window.waypoints.push({
                lat: pendingWaypoint.lat,
                lng: pendingWaypoint.lng,
                name: name,
                desc: desc,
                img: hasImage ? imgPreview : null,
                marker: marker
            });
            // Dragend updatez coordonatele in array si redesenez traseul
            (function(idx) {
                marker.on('dragend', function() {
                    var pos = marker.getLatLng();
                    window.waypoints[idx].lat = pos.lat;
                    window.waypoints[idx].lng = pos.lng;
                    drawRoute();
                    updateRouteStats();
                });
            })(wpIndex);
            drawRoute();
            updateRouteStats();
            window.closeModal(waypointModal);
            pendingWaypoint = null;
        });
    }
    // Buton Undo
    var undoBtn = document.getElementById("undo-waypoint");
    if (undoBtn) {
        undoBtn.addEventListener("click", function() {
            if (window.waypoints.length > 0) {
                var lastWp = window.waypoints.pop();
                createMap.removeLayer(lastWp.marker);
                drawRoute();
                updateRouteStats();
            }
        });
    }
    // Functie care sterge tot traseul
    window.clearRouteData = function() {
        for (var i = 0; i < window.waypoints.length; i++) {
            createMap.removeLayer(window.waypoints[i].marker);
        }
        window.waypoints = [];
        if (routePolyline != null) {
            createMap.removeLayer(routePolyline);
            routePolyline = null;
        }
        updateRouteStats();
    };
    // Buton Clear - apeleaza functia de mai sus
    var clearBtn = document.getElementById("clear-route");
    if (clearBtn) {
        clearBtn.addEventListener("click", function() {
            window.clearRouteData();
        });
    }
});