// app-core.js - Main Application Logic and UI Management

// Global state management
const AppState = {
    currentMode: 'camera',
    currentPhase: 0,
    capturedData: {
        front: null, sideLeft: null, sideRight: null, back: null,
        frontLandmarks: null, sideLeftLandmarks: null, sideRightLandmarks: null, backLandmarks: null
    },
    uploadedData: {
        front: null, sideLeft: null, sideRight: null, back: null,
        frontLandmarks: null, sideLeftLandmarks: null, sideRightLandmarks: null, backLandmarks: null
    },
    postureAnalysis: null,
    phases: [
        { name: 'front', instruction: 'Stand facing the camera with arms relaxed at your sides' },
        { name: 'sideLeft', instruction: 'Turn to your LEFT side (90 degrees) with arms relaxed' },
        { name: 'sideRight', instruction: 'Turn to your RIGHT side (90 degrees) with arms relaxed' },
        { name: 'back', instruction: 'Turn your back to the camera with arms relaxed at your sides' }
    ]
};

// DOM element references
const Elements = {
    // Mode switching
    cameraModeBtn: document.getElementById('cameraMode'),
    uploadModeBtn: document.getElementById('uploadMode'),
    cameraSection: document.getElementById('cameraSection'),
    uploadSection: document.getElementById('uploadSection'),
    
    // Camera controls
    startBtn: document.getElementById('startBtn'),
    captureBtn: document.getElementById('captureBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    
    // Upload controls
    frontUpload: document.getElementById('frontUpload'),
    sideLeftUpload: document.getElementById('sideLeftUpload'),
    sideRightUpload: document.getElementById('sideRightUpload'),
    backUpload: document.getElementById('backUpload'),
    analyzeUploadsBtn: document.getElementById('analyzeUploadsBtn'),
    downloadUploadBtn: document.getElementById('downloadUploadBtn'),
    
    // Display elements
    statusText: document.getElementById('statusText'),
    capturedImagesDiv: document.getElementById('capturedImages')
};

// Application initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Clinical Posture Analysis App...');
    initializeEventListeners();
    initializeModalEventListeners();
    console.log('App initialized successfully');
});

function initializeEventListeners() {
    // Mode switching
    Elements.cameraModeBtn?.addEventListener('click', () => {
        console.log('Camera mode selected');
        switchToCamera();
    });

    Elements.uploadModeBtn?.addEventListener('click', () => {
        console.log('Upload mode selected');
        switchToUpload();
    });

    // Camera controls
    Elements.startBtn?.addEventListener('click', () => {
        console.log('Start button clicked');
        if (typeof CameraHandler !== 'undefined') {
            CameraHandler.startAnalysis();
        }
    });

    Elements.captureBtn?.addEventListener('click', () => {
        console.log('Capture button clicked');
        if (typeof CameraHandler !== 'undefined') {
            CameraHandler.captureImage();
        }
    });

    // Upload handlers
    Elements.frontUpload?.addEventListener('change', (e) => handleImageUpload(e, 'front'));
    Elements.sideLeftUpload?.addEventListener('change', (e) => handleImageUpload(e, 'sideLeft'));
    Elements.sideRightUpload?.addEventListener('change', (e) => handleImageUpload(e, 'sideRight'));
    Elements.backUpload?.addEventListener('change', (e) => handleImageUpload(e, 'back'));

    // Analyze uploads button
    Elements.analyzeUploadsBtn?.addEventListener('click', () => {
        console.log('Analyze uploads button clicked');
        analyzeUploads();
    });

    // Download buttons
    Elements.downloadBtn?.addEventListener('click', () => {
        console.log('Download button clicked');
        if (!AppState.postureAnalysis) {
            alert('Please complete the analysis first!');
            return;
        }
        if (typeof PDFGenerator !== 'undefined') {
            PDFGenerator.showPDFEditModal(AppState.capturedData);
        }
    });

    Elements.downloadUploadBtn?.addEventListener('click', () => {
        console.log('Download upload button clicked');
        if (!AppState.postureAnalysis) {
            alert('Please complete the analysis first!');
            return;
        }
        if (typeof PDFGenerator !== 'undefined') {
            PDFGenerator.showPDFEditModal(AppState.uploadedData);
        }
    });
}

// Mode switching functions
function switchToCamera() {
    AppState.currentMode = 'camera';
    Elements.cameraModeBtn.classList.add('active');
    Elements.uploadModeBtn.classList.remove('active');
    Elements.cameraSection.style.display = 'block';
    Elements.uploadSection.style.display = 'none';
    Elements.statusText.innerHTML = 'Click "Start Analysis" to begin clinical postural assessment';
    resetAnalysis();
}

function switchToUpload() {
    AppState.currentMode = 'upload';
    Elements.uploadModeBtn.classList.add('active');
    Elements.cameraModeBtn.classList.remove('active');
    Elements.cameraSection.style.display = 'none';
    Elements.uploadSection.style.display = 'block';
    Elements.statusText.innerHTML = 'Upload your front, left side, right side, and back view photos for analysis';
    resetAnalysis();
}

function resetAnalysis() {
    AppState.capturedData = { 
        front: null, sideLeft: null, sideRight: null, back: null, 
        frontLandmarks: null, sideLeftLandmarks: null, sideRightLandmarks: null, backLandmarks: null 
    };
    AppState.uploadedData = { 
        front: null, sideLeft: null, sideRight: null, back: null, 
        frontLandmarks: null, sideLeftLandmarks: null, sideRightLandmarks: null, backLandmarks: null 
    };
    AppState.postureAnalysis = null;
    Elements.capturedImagesDiv.innerHTML = '';
    Elements.downloadBtn.disabled = true;
    Elements.downloadUploadBtn.disabled = true;
    Elements.analyzeUploadsBtn.disabled = true;
    updateProgressIndicator();
}

// Image upload handling
function handleImageUpload(event, view) {
    console.log(`Uploading ${view} image...`);
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Create canvas to store image data
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            AppState.uploadedData[view] = canvas.toDataURL('image/png');
            
            // Update UI
            const uploadBox = event.target.parentElement;
            uploadBox.classList.add('has-image');
            
            let viewLabel = view.charAt(0).toUpperCase() + view.slice(1);
            if (view === 'sideLeft') viewLabel = 'Side View (Left)';
            if (view === 'sideRight') viewLabel = 'Side View (Right)';
            
            uploadBox.innerHTML = `
                <img src="${AppState.uploadedData[view]}" alt="${view} view" class="upload-preview">
                <div class="upload-text"><strong>${viewLabel}</strong><br>Click to change</div>
            `;
            uploadBox.onclick = () => event.target.click();
            
            updateProgressIndicator();
            checkUploadCompletion();
            
            // Process image with pose detection
            if (typeof CameraHandler !== 'undefined') {
                CameraHandler.processUploadedImage(img, view);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function analyzeUploads() {
    console.log('Analyzing uploaded images...');
    Elements.analyzeUploadsBtn.disabled = true;
    Elements.statusText.innerHTML = 'Analyzing uploaded images... <div class="loading"></div>';
    
    // Display uploaded images
    Elements.capturedImagesDiv.innerHTML = '';
    ['front', 'sideLeft', 'sideRight', 'back'].forEach(view => {
        if (AppState.uploadedData[view]) {
            let viewLabel = view.charAt(0).toUpperCase() + view.slice(1);
            if (view === 'sideLeft') viewLabel = 'Side Left';
            if (view === 'sideRight') viewLabel = 'Side Right';
            
            const imageDiv = document.createElement('div');
            imageDiv.className = 'captured-image';
            imageDiv.innerHTML = `
                <h3>${viewLabel} View</h3>
                <img src="${AppState.uploadedData[view]}" alt="${view} view">
            `;
            Elements.capturedImagesDiv.appendChild(imageDiv);
        }
    });

    // Perform analysis
    setTimeout(() => {
        if (typeof AnalysisEngine !== 'undefined') {
            AnalysisEngine.analyzeUploadedPosture();
        }
        Elements.statusText.innerHTML = 'Analysis complete! Click "Download Clinical Report" to get your assessment.';
        Elements.downloadUploadBtn.disabled = false;
    }, 2000);
}

function updateProgressIndicator() {
    const frontProgress = document.getElementById('frontProgress');
    const sideLeftProgress = document.getElementById('sideLeftProgress');
    const sideRightProgress = document.getElementById('sideRightProgress');
    const backProgress = document.getElementById('backProgress');

    if (frontProgress) frontProgress.className = AppState.uploadedData.front ? 'progress-step completed' : 'progress-step';
    if (sideLeftProgress) sideLeftProgress.className = AppState.uploadedData.sideLeft ? 'progress-step completed' : 'progress-step';
    if (sideRightProgress) sideRightProgress.className = AppState.uploadedData.sideRight ? 'progress-step completed' : 'progress-step';
    if (backProgress) backProgress.className = AppState.uploadedData.back ? 'progress-step completed' : 'progress-step';
}

function checkUploadCompletion() {
    const hasAllImages = AppState.uploadedData.front && 
                        AppState.uploadedData.sideLeft && 
                        AppState.uploadedData.sideRight && 
                        AppState.uploadedData.back;
    if (Elements.analyzeUploadsBtn) {
        Elements.analyzeUploadsBtn.disabled = !hasAllImages;
    }
    
    if (hasAllImages) {
        Elements.statusText.innerHTML = 'All images uploaded! Click "Analyze Uploaded Images" to process.';
    }
}

function initializeModalEventListeners() {
    // This will be enhanced by pdf-generator.js
    console.log('Modal event listeners will be initialized by PDF generator module');
}
