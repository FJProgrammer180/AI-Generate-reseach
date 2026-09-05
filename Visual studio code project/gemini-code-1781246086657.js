// --- FUNGSI UTAMA TRACKING (VERSI PERBAIKAN) ---
        function onResults(results) {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            
            // Gambar Video Asli
            canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

            let activeTechnique = "none";
            let centerPoint = { x: 0, y: 0 };

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                statusText.innerText = "Energi Kutukan Terdeteksi!";
                statusText.style.color = "#ff0055";

                // Gambar Garis Tangan
                for (const landmarks of results.multiHandLandmarks) {
                    drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00ffff', lineWidth: 3});
                    drawLandmarks(canvasCtx, landmarks, {color: '#ff0055', lineWidth: 1, radius: 3});
                }

                // LOGIKA DETEKSI JURUS (Dibuat lebih sensitif)
                if (results.multiHandLandmarks.length === 1) {
                    // Deteksi RED: Jempol (4) dan Telunjuk (8)
                    let lm = results.multiHandLandmarks[0];
                    let dist = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y);
                    
                    // Toleransi jarak dinaikkan jadi 0.08 agar lebih mudah aktif
                    if (dist < 0.08) {
                        activeTechnique = "RED";
                        // Membalikkan koordinat X agar pas dengan efek cermin canvas
                        centerPoint.x = (1 - lm[8].x) * canvasElement.width;
                        centerPoint.y = lm[8].y * canvasElement.height;
                    }

                } else if (results.multiHandLandmarks.length === 2) {
                    // Deteksi MALEVOLENT SHRINE: Pergelangan tangan dekat
                    let lm1 = results.multiHandLandmarks[0];
                    let lm2 = results.multiHandLandmarks[1];
                    let dist = Math.hypot(lm1[0].x - lm2[0].x, lm1[0].y - lm2[0].y);

                    // Toleransi jarak dinaikkan jadi 0.25
                    if (dist < 0.25) {
                        activeTechnique = "SHRINE";
                        centerPoint.x = (1 - ((lm1[0].x + lm2[0].x) / 2)) * canvasElement.width;
                        centerPoint.y = (lm1[0].y + lm2[0].y) / 2 * canvasElement.height;
                    }
                }
            } else {
                statusText.innerText = "Mencari Energi Kutukan...";
                statusText.style.color = "#00ffcc";
            }

            // --- EKSEKUSI VISUAL JURUS ---
            if (activeTechnique === "RED") {
                techName.innerText = "Reversal: Red";
                techName.style.color = "#ff0000";
                techName.style.opacity = 1;
                for(let i = 0; i < 15; i++) {
                    particles.push(new Particle(centerPoint.x, centerPoint.y, '#ff0000', 'red'));
                    particles.push(new Particle(centerPoint.x, centerPoint.y, '#ffffff', 'red'));
                }
            } else if (activeTechnique === "SHRINE") {
                techName.innerText = "Domain Expansion: Malevolent Shrine";
                techName.style.color = "#ff0055";
                techName.style.opacity = 1;
                
                canvasCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
                canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

                for(let i = 0; i < 8; i++) {
                    let rx = Math.random() * canvasElement.width;
                    let ry = Math.random() * canvasElement.height;
                    particles.push(new Particle(rx, ry, '#ff0033', 'slash'));
                    particles.push(new Particle(rx, ry, '#111111', 'slash'));
                }
            } else {
                techName.style.opacity = 0;
            }

            // Update & Gambar Partikel
            canvasCtx.globalCompositeOperation = 'lighter';
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw(canvasCtx);
                if (particles[i].life <= 0) {
                    particles.splice(i, 1);
                }
            }
            canvasCtx.globalCompositeOperation = 'source-over';

            canvasCtx.restore();
        }

        // --- SETUP CAMERA & MEDIAPIPE ---
        const hands = new Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5, // Diturunkan sedikit agar lebih sensitif di ruang remang
            minTrackingConfidence: 0.5
        });
        hands.onResults(onResults);

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({image: videoElement});
            },
            width: 1280,
            height: 720
        });
        camera.start();