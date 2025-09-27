// camera-handler.js - Camera and MediaPipe Pose Detection

const CameraHandler = {
    // Camera and pose detection variables
    videoElement: document.getElementById('videoElement'),
    canvasElement: document.getElementById('canvasElement'),
    canvasCtx: null,
    camera: null,
    pose: null,
    currentLandmarks: null,

    // UI elements
    countdown: document.getElementById('countdown'),
    poseIndicator: document.getElementById('poseIndicator'),
    measurementOverlay: document.getElementById('measurementOverlay'),

    init() {
        this.canvasCtx = this.canvasElement.getContext('2d');
        console.log('Camera handler initialized');
    },

    async startAnalysis() {
        console.log('Starting camera analysis...');
        try {
            Elements.startBtn.disabled = true;
            Elements.captureBtn.disabled = false;
            AppState.currentPhase = 0;
            AppState.capturedData = { 
                front: null, side: null, back: null, 
                frontLandmarks: null, sideLandmarks: null, backLandmarks: null 
            };
            Elements.capturedImagesDiv.innerHTML = '';

            Elements.statusText.innerHTML = 'Initializing clinical pose detection... <div class="loading"></div>';

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
        // Create a temporary canvas for capture
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvasElement.width;
        tempCanvas.height = this.canvasElement.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the current frame without mirroring
        tempCtx.save();
        tempCtx.scale(-1, 1);
        tempCtx.drawImage(this.canvasElement, -tempCanvas.width, 0);
        tempCtx.restore();

        const imageData = tempCanvas.toDataURL('image/png');
        const phaseName = AppState.phases[AppState.currentPhase].name;

        AppState.capturedData[phaseName] = imageData;
        AppState.capturedData[phaseName + 'Landmarks'] = JSON.parse(JSON.stringify(this.currentLandmarks));

        // Display captured image
        const imageDiv = document.createElement('div');
        imageDiv.className = 'captured-image';
        imageDiv.innerHTML = `
            <h3>${phaseName.charAt(0).toUpperCase() + phaseName.slice(1)} View</h3>
            <img src="${imageData}" alt="${phaseName} view">
        `;
        Elements.capturedImagesDiv.appendChild(imageDiv);

        AppState.currentPhase++;

        if (AppState.currentPhase < AppState.phases.length) {
            Elements.statusText.innerHTML = `<span class="instruction">${AppState.phases[AppState.currentPhase].instruction}</span>`;
            Elements.captureBtn.disabled = false;
            this.measurementOverlay.classList.add('hidden');
        } else {
            Elements.statusText.innerHTML = '✓ Clinical analysis complete! Click "Download Clinical Report" to get your assessment.';
            Elements.captureBtn.disabled = true;
            Elements.downloadBtn.disabled = false;
            this.measurementOverlay.classList.add('hidden');
            if (typeof AnalysisEngine !== 'undefined') {
                AnalysisEngine.analyzePosture();
            }
        }
    },

    // Initialize MediaPipe Pose
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

    // Handle pose detection results
    onResults(results) {
        if (AppState.currentMode === 'camera') {
            this.canvasElement.width = this.videoElement.videoWidth;
            this.canvasElement.height = this.videoElement.videoHeight;

            this.canvasCtx.save();
            this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

            // Draw video
            this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);

            // Draw pose landmarks
            if (results.poseLandmarks) {
                drawConnectors(this.canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                    { color: '#00FF00', lineWidth: 3 });
                drawLandmarks(this.canvasCtx, results.poseLandmarks,
                    { color: '#FF0000', lineWidth: 2, radius: 4 });

                this.currentLandmarks = results.poseLandmarks;
                this.poseIndicator.classList.remove('hidden');

                // Show real-time measurements
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
            // For upload mode, just store the landmarks
            if (results.poseLandmarks) {
                this.currentLandmarks = results.poseLandmarks;
            }
        }
    },

    // Show real-time measurements overlay
    showRealTimeMeasurements(landmarks) {
        let measurements = '';

        if (AppState.phases[AppState.currentPhase].name === 'front' || 
            AppState.phases[AppState.currentPhase].name === 'back') {
            
            if (typeof AnalysisEngine !== 'undefined') {
                const frontAnalysis = AnalysisEngine.analyzeFrontView(landmarks);
                measurements = `
                    <div>${AppState.phases[AppState.currentPhase].name.toUpperCase()} VIEW ANALYSIS:</div>
                    <div>Neck deviation: ${frontAnalysis.measurements.neckDeviation}°</div>
                    <div>Shoulder height diff: ${frontAnalysis.measurements.shoulderHeightDiff}°</div>
                    <div>Elbow height diff: ${frontAnalysis.measurements.elbowHeightDiff}°</div>
                    <div>Hip height diff: ${frontAnalysis.measurements.hipHeightDiff}°</div>
                    <div>Knee alignment: L:${frontAnalysis.measurements.leftKneeAngle}° R:${frontAnalysis.measurements.rightKneeAngle}°</div>
                `;
            }
        } else if (AppState.phases[AppState.currentPhase].name === 'side') {
            if (typeof AnalysisEngine !== 'undefined') {
                const sideAnalysis = AnalysisEngine.analyzeSideView(landmarks);
                measurements = `
                    <div>SIDE VIEW ANALYSIS:</div>
                    <div>Neck forward: ${sideAnalysis.measurements.neckForward}°</div>
                    <div>Back bend: ${sideAnalysis.measurements.backBend}°</div>
                    <div>Knee bend: ${sideAnalysis.measurements.kneeBend}°</div>
                `;
            }
        }

        this.measurementOverlay.innerHTML = measurements;
        this.measurementOverlay.classList.remove('hidden');
    },

    // Start camera
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
            // Wait for pose to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Create a temporary canvas for pose processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);

        // Process with MediaPipe
        try {
            await this.pose.send({ image: tempCanvas });
            // The onResults callback will handle storing landmarks
            setTimeout(() => {
                if (this.currentLandmarks) {
                    AppState.uploadedData[view + 'Landmarks'] = JSON.parse(JSON.stringify(this.currentLandmarks));
                    Elements.statusText.innerHTML = `${view.charAt(0).toUpperCase() + view.slice(1)} view processed successfully`;
                }
            }, 500);
        } catch (error) {
            console.warn(`Could not detect pose in ${view} image:`, error);
            Elements.statusText.innerHTML = `Warning: No pose detected in ${view} image. Analysis may be limited.`;
        }
    }
};

// Initialize camera handler when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    CameraHandler.init();
});