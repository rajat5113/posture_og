// camera-handler.js - Enhanced Camera and Pose Detection

const CameraHandler = {
    videoElement: document.getElementById('videoElement'),
    canvasElement: document.getElementById('canvasElement'),
    canvasCtx: null,
    camera: null,
    pose: null,
    currentLandmarks: null,
    countdown: document.getElementById('countdown'),
    poseIndicator: document.getElementById('poseIndicator'),
    measurementOverlay: document.getElementById('measurementOverlay'),

    init() {
        this.canvasCtx = this.canvasElement.getContext('2d');
        console.log('Enhanced camera handler initialized');
    },

    async startAnalysis() {
        console.log('Starting camera analysis...');
        try {
            Elements.startBtn.disabled = true;
            Elements.captureBtn.disabled = false;
            AppState.currentPhase = 0;
            AppState.capturedData = { 
                front: null, sideLeft: null, sideRight: null, back: null, 
                frontLandmarks: null, sideLeftLandmarks: null, sideRightLandmarks: null, backLandmarks: null 
            };
            Elements.capturedImagesDiv.innerHTML = '';

            Elements.statusText.innerHTML = 'Initializing comprehensive pose detection... <div class="loading"></div>';

            if (!this.pose) {
                this.initializePose();
            }

            if (!this.camera) {
                await this.startCamera();
            }

            setTimeout(() => {
                Elements.statusText.innerHTML = `<span class="instruction">${AppState.phases[AppState.currentPhase].instruction}</span>`;
            }, 2000);
        } catch (error) {
            console.error('Error starting analysis:', error);
            Elements.statusText.innerHTML = 'Error starting camera. Please check permissions and try again.';
            Elements.startBtn.disabled = false;
        }
    },

    captureImage() {
        if (!this.currentLandmarks) {
            alert('No pose detected! Please ensure you are clearly visible in the camera.');
            return;
        }

        let countdownValue = 3;
        this.countdown.classList.remove('hidden');
        Elements.captureBtn.disabled = true;

        const countdownInterval = setInterval(() => {
            this.countdown.textContent = countdownValue;
            this.countdown.style.animation = 'none';
            void this.countdown.offsetWidth;
            this.countdown.style.animation = 'countdownPulse 1s ease-out';

            countdownValue--;

            if (countdownValue < 0) {
                clearInterval(countdownInterval);
                this.countdown.classList.add('hidden');
                this.processCapturedImage();
            }
        }, 1000);
    },

    processCapturedImage() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvasElement.width;
        tempCanvas.height = this.canvasElement.height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.save();
        tempCtx.scale(-1, 1);
        tempCtx.drawImage(this.canvasElement, -tempCanvas.width, 0);
        tempCtx.restore();

        const imageData = tempCanvas.toDataURL('image/png');
        const phaseName = AppState.phases[AppState.currentPhase].name;

        AppState.capturedData[phaseName] = imageData;
        AppState.capturedData[phaseName + 'Landmarks'] = JSON.parse(JSON.stringify(this.currentLandmarks));

        let viewLabel = phaseName.charAt(0).toUpperCase() + phaseName.slice(1);
        if (phaseName === 'sideLeft') viewLabel = 'Side Left';
        if (phaseName === 'sideRight') viewLabel = 'Side Right';

        const imageDiv = document.createElement('div');
        imageDiv.className = 'captured-image';
        imageDiv.innerHTML = `
            <h3>${viewLabel} View</h3>
            <img src="${imageData}" alt="${phaseName} view">
        `;
        Elements.capturedImagesDiv.appendChild(imageDiv);

        AppState.currentPhase++;

        if (AppState.currentPhase < AppState.phases.length) {
            Elements.statusText.innerHTML = `<span class="instruction">${AppState.phases[AppState.currentPhase].instruction}</span>`;
            Elements.captureBtn.disabled = false;
            this.measurementOverlay.classList.add('hidden');
        } else {
            Elements.statusText.innerHTML = 'Comprehensive clinical analysis complete! Click "Download Clinical Report" for your detailed assessment.';
            Elements.captureBtn.disabled = true;
            Elements.downloadBtn.disabled = false;
            this.measurementOverlay.classList.add('hidden');
            if (typeof AnalysisEngine !== 'undefined') {
                AnalysisEngine.analyzePosture();
            }
        }
    },

    initializePose() {
        console.log('Initializing MediaPipe Pose...');
        try {
            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });

            this.pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            this.pose.onResults(this.onResults.bind(this));
            console.log('MediaPipe Pose initialized successfully');
        } catch (error) {
            console.error('Error initializing MediaPipe Pose:', error);
        }
    },

    onResults(results) {
        if (AppState.currentMode === 'camera') {
            this.canvasElement.width = this.videoElement.videoWidth;
            this.canvasElement.height = this.videoElement.videoHeight;

            this.canvasCtx.save();
            this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

            this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);

            if (results.poseLandmarks) {
                drawConnectors(this.canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                    { color: '#00FF00', lineWidth: 3 });
                drawLandmarks(this.canvasCtx, results.poseLandmarks,
                    { color: '#FF0000', lineWidth: 2, radius: 4 });

                this.currentLandmarks = results.poseLandmarks;
                this.poseIndicator.classList.remove('hidden');

                if (AppState.currentPhase < AppState.phases.length) {
                    this.showRealTimeMeasurements(results.poseLandmarks);
                }
            } else {
                this.poseIndicator.classList.add('hidden');
                this.measurementOverlay.classList.add('hidden');
                this.currentLandmarks = null;
            }

            this.canvasCtx.restore();
        } else {
            if (results.poseLandmarks) {
                this.currentLandmarks = results.poseLandmarks;
            }
        }
    },

    showRealTimeMeasurements(landmarks) {
        let measurements = '';
        const currentView = AppState.phases[AppState.currentPhase].name;

        if (currentView === 'front') {
            if (typeof AnalysisEngine !== 'undefined') {
                const frontAnalysis = AnalysisEngine.analyzeFrontView(landmarks);
                measurements = `
                    <div style="font-weight: bold; margin-bottom: 5px;">FRONT VIEW - REAL-TIME MEASUREMENTS:</div>
                    <div>Ear Pinnae Level: ${frontAnalysis.measurements.earPinnaeLevel}° (${frontAnalysis.measurements.earPinnaeLevelCm} cm)</div>
                    <div>Neck Level: ${frontAnalysis.measurements.neckLevel}° (${frontAnalysis.measurements.neckLevelCm} cm)</div>
                    <div>Shoulder Level: ${frontAnalysis.measurements.shoulderLevel}° (${frontAnalysis.measurements.shoulderLevelCm} cm)</div>
                    <div>Elbow Level: ${frontAnalysis.measurements.elbowLevel}° (${frontAnalysis.measurements.elbowLevelCm} cm)</div>
                    <div>Pelvic Obliquity: ${frontAnalysis.measurements.pelvicObliquity}° (${frontAnalysis.measurements.pelvicObliquityCm} cm)</div>
                    <div>Knee Level: ${frontAnalysis.measurements.kneeLevel}° (${frontAnalysis.measurements.kneeLevelCm} cm)</div>
                    <div>Knee Alignment: L:${frontAnalysis.measurements.leftKneeAlignment}° R:${frontAnalysis.measurements.rightKneeAlignment}°</div>
                `;
            }
        } else if (currentView === 'sideLeft' || currentView === 'sideRight') {
            if (typeof AnalysisEngine !== 'undefined') {
                const sideAnalysis = AnalysisEngine.analyzeSideView(landmarks);
                const viewLabel = currentView === 'sideLeft' ? 'SIDE LEFT' : 'SIDE RIGHT';
                measurements = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${viewLabel} VIEW - REAL-TIME MEASUREMENTS:</div>
                    <div>Forward Neck: ${sideAnalysis.measurements.forwardNeck}° (${sideAnalysis.measurements.forwardNeckCm} cm)</div>
                    <div>Chin Forward: ${sideAnalysis.measurements.chinForward}° (${sideAnalysis.measurements.chinForwardCm} cm)</div>
                    <div>Shoulder Position: ${sideAnalysis.measurements.shoulderPosition}° ${sideAnalysis.measurements.shoulderPostureType || ''}</div>
                    <div>Thoracic Curvature: ${sideAnalysis.measurements.thoracicCurvature}° (${sideAnalysis.measurements.thoracicCurvatureType || 'Normal'})</div>
                    <div>Lumbar Curvature: ${sideAnalysis.measurements.lumbarCurvature}° (${sideAnalysis.measurements.lumbarCurvatureType || 'Normal'})</div>
                    <div>Knee Position: ${sideAnalysis.measurements.kneePosition}° ${sideAnalysis.measurements.kneePositionType || ''}</div>
                `;
            }
        } else if (currentView === 'back') {
            if (typeof AnalysisEngine !== 'undefined') {
                const backAnalysis = AnalysisEngine.analyzeBackView(landmarks);
                measurements = `
                    <div style="font-weight: bold; margin-bottom: 5px;">BACK VIEW - REAL-TIME MEASUREMENTS:</div>
                    <div>Elbow Level: ${backAnalysis.measurements.elbowLevel}° (${backAnalysis.measurements.elbowLevelCm} cm)</div>
                    <div>Scapular Level: ${backAnalysis.measurements.scapularLevel}° (${backAnalysis.measurements.scapularLevelCm} cm)</div>
                    <div>PSIS Level: ${backAnalysis.measurements.psisLevel}° (${backAnalysis.measurements.psisLevelCm} cm)</div>
                    <div>Gluteal Fold Asymmetry: ${backAnalysis.measurements.glutealFoldAsymmetry}%</div>
                    <div>Popliteal Line: ${backAnalysis.measurements.poplitealLine}° (${backAnalysis.measurements.poplitealLineCm} cm)</div>
                `;
            }
        }

        this.measurementOverlay.innerHTML = measurements;
        this.measurementOverlay.classList.remove('hidden');
    },

    async startCamera() {
        console.log('Starting camera...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            this.videoElement.srcObject = stream;
            await this.videoElement.play();

            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.pose) {
                        await this.pose.send({ image: this.videoElement });
                    }
                },
                width: 640,
                height: 480
            });

            this.camera.start();
            console.log('Camera started successfully');
        } catch (error) {
            console.error('Error accessing camera:', error);
            Elements.statusText.innerHTML = 'Error: Unable to access camera. Please ensure camera permissions are granted.';
        }
    },

    async processUploadedImage(img, view) {
        if (!this.pose) {
            this.initializePose();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);

        try {
            await this.pose.send({ image: tempCanvas });
            setTimeout(() => {
                if (this.currentLandmarks) {
                    AppState.uploadedData[view + 'Landmarks'] = JSON.parse(JSON.stringify(this.currentLandmarks));
                    let viewLabel = view.charAt(0).toUpperCase() + view.slice(1);
                    if (view === 'sideLeft') viewLabel = 'Side Left';
                    if (view === 'sideRight') viewLabel = 'Side Right';
                    Elements.statusText.innerHTML = `${viewLabel} view processed - pose detected successfully`;
                }
            }, 500);
        } catch (error) {
            console.warn(`Could not detect pose in ${view} image:`, error);
            Elements.statusText.innerHTML = `Warning: No pose detected in ${view} image. Analysis may be limited.`;
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    CameraHandler.init();
});