// analysis-engine.js - Clinical Posture Analysis with User Calibration

const AnalysisEngine = {
    // User calibration values (will be set by user input)
    userCalibration: {
        headWidth: 15,      // Default: 15cm
        shoulderWidth: 40,  // Default: 40cm
        hipWidth: 35,       // Default: 35cm
        neckLength: 20      // Default: 20cm
    },
    
    // Method to update calibration values
    setCalibration(headWidth, shoulderWidth, hipWidth, neckLength) {
        this.userCalibration.headWidth = headWidth || 15;
        this.userCalibration.shoulderWidth = shoulderWidth || 40;
        this.userCalibration.hipWidth = hipWidth || 35;
        this.userCalibration.neckLength = neckLength || 20;
        
        console.log('Calibration updated:', this.userCalibration);
    },
    
    calculateAngle(a, b, c) {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) angle = 360 - angle;
        return angle;
    },

    calculateSlopeAngle(point1, point2) {
        const deltaY = point2.y - point1.y;
        const deltaX = point2.x - point1.x;
        const rawAngle = Math.abs(Math.atan2(deltaY, deltaX) * 180 / Math.PI);
        if (rawAngle > 90) {
            return 180 - rawAngle;
        }
        return rawAngle;
    },

    calculateHorizontalDeviation(point1, point2) {
        const deltaX = Math.abs(point2.x - point1.x);
        const deltaY = Math.abs(point2.y - point1.y);
        if (deltaY === 0) return 0;
        return Math.atan2(deltaX, deltaY) * 180 / Math.PI;
    },

    // Enhanced Front View Analysis with User Calibration
    analyzeFrontView(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            return { issues: [], recommendations: [], measurements: {} };
        }

        const issues = [];
        const recommendations = [];
        const measurements = {};

        const leftEar = landmarks[7];
        const rightEar = landmarks[8];
        const nose = landmarks[0];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];

        // Use USER CALIBRATION VALUES
        const HEAD_WIDTH_CM = this.userCalibration.headWidth;
        const SHOULDER_WIDTH_CM = this.userCalibration.shoulderWidth;
        const HIP_WIDTH_CM = this.userCalibration.hipWidth;

        // Calculate pixel distances
        const earDistancePx = Math.sqrt(Math.pow(rightEar.x - leftEar.x, 2) + Math.pow(rightEar.y - leftEar.y, 2));
        const shoulderDistancePx = Math.sqrt(Math.pow(rightShoulder.x - leftShoulder.x, 2) + Math.pow(rightShoulder.y - leftShoulder.y, 2));
        const hipDistancePx = Math.sqrt(Math.pow(rightHip.x - leftHip.x, 2) + Math.pow(rightHip.y - leftHip.y, 2));

        // Calculate conversion ratios
        const headRatio = HEAD_WIDTH_CM / earDistancePx;
        const shoulderRatio = SHOULDER_WIDTH_CM / shoulderDistancePx;
        const hipRatio = HIP_WIDTH_CM / hipDistancePx;

        // 1. EAR PINNAE LEVEL
        const earAngle = this.calculateSlopeAngle(leftEar, rightEar);
        measurements.earPinnaeLevel = earAngle.toFixed(1);
        const earHeightDiffPx = Math.abs(leftEar.y - rightEar.y);
        measurements.earPinnaeLevelCm = (earHeightDiffPx * headRatio).toFixed(1);

        if (earAngle > 3) {
            const higherEar = leftEar.y < rightEar.y ? 'left' : 'right';
            issues.push(`Ear pinnae asymmetry: ${earAngle.toFixed(1)}° tilt (${measurements.earPinnaeLevelCm} cm height difference), ${higherEar} ear higher (Normal: <3° or <1 cm)`);
            recommendations.push('• Assess for cervical rotation restrictions');
            recommendations.push('• Cranial tilt correction exercises');
        }

        // 2. NECK LEVEL
        const shoulderMidpoint = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };

        const neckDeviation = this.calculateHorizontalDeviation(shoulderMidpoint, nose);
        measurements.neckLevel = neckDeviation.toFixed(1);
        const neckHorizontalDistPx = Math.abs(nose.x - shoulderMidpoint.x);
        measurements.neckLevelCm = (neckHorizontalDistPx * shoulderRatio).toFixed(1);

        if (neckDeviation > 5) {
            const side = nose.x < shoulderMidpoint.x ? 'left' : 'right';
            issues.push(`Cervical lateral deviation: ${neckDeviation.toFixed(1)}° (${measurements.neckLevelCm} cm) to the ${side} (Normal: <5° or <1.5 cm)`);
            recommendations.push('• Cervical lateral flexion stretching');
            recommendations.push('• Sternocleidomastoid and scalene muscle balancing');
        }

        // 3. SHOULDER LEVEL
        const shoulderAngle = this.calculateSlopeAngle(leftShoulder, rightShoulder);
        measurements.shoulderLevel = shoulderAngle.toFixed(1);
        const shoulderHeightDiffPx = Math.abs(leftShoulder.y - rightShoulder.y);
        measurements.shoulderLevelCm = (shoulderHeightDiffPx * shoulderRatio).toFixed(1);

        if (shoulderAngle > 2) {
            const higherSide = leftShoulder.y < rightShoulder.y ? 'left' : 'right';
            issues.push(`Shoulder level asymmetry: ${shoulderAngle.toFixed(1)}° tilt (${measurements.shoulderLevelCm} cm), ${higherSide} shoulder elevated (Normal: <2° or <1.5 cm)`);
            recommendations.push('• Upper trapezius stretching on elevated side');
            recommendations.push('• Lower trapezius strengthening on depressed side');
        }

        // 4. ELBOW LEVEL
        const elbowAngle = this.calculateSlopeAngle(leftElbow, rightElbow);
        measurements.elbowLevel = elbowAngle.toFixed(1);
        const elbowHeightDiffPx = Math.abs(leftElbow.y - rightElbow.y);
        measurements.elbowLevelCm = (elbowHeightDiffPx * shoulderRatio).toFixed(1);

        if (elbowAngle > 3) {
            const higherElbow = leftElbow.y < rightElbow.y ? 'left' : 'right';
            issues.push(`Elbow level asymmetry: ${elbowAngle.toFixed(1)}° tilt (${measurements.elbowLevelCm} cm), ${higherElbow} elbow elevated (Normal: <3° or <2 cm)`);
            recommendations.push('• Assess shoulder girdle complex');
        }

        // 5. PELVIC OBLIQUITY
        const hipAngle = this.calculateSlopeAngle(leftHip, rightHip);
        measurements.pelvicObliquity = hipAngle.toFixed(1);
        const hipHeightDiffPx = Math.abs(leftHip.y - rightHip.y);
        measurements.pelvicObliquityCm = (hipHeightDiffPx * hipRatio).toFixed(1);

        if (hipAngle > 2) {
            const higherHip = leftHip.y < rightHip.y ? 'left' : 'right';
            issues.push(`Pelvic obliquity: ${hipAngle.toFixed(1)}° tilt (${measurements.pelvicObliquityCm} cm), ${higherHip} iliac crest elevated (Normal: <2° or <1.5 cm)`);
            recommendations.push('• Leg length discrepancy assessment required');
            recommendations.push('• Hip abductor strengthening');
        }

        // 6. KNEE ALIGNMENT
        const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        
        const leftKneeDeviation = Math.abs(180 - leftKneeAngle);
        const rightKneeDeviation = Math.abs(180 - rightKneeAngle);

        measurements.leftKneeAlignment = leftKneeDeviation.toFixed(1);
        measurements.rightKneeAlignment = rightKneeDeviation.toFixed(1);

        const leftKneeType = leftKneeAngle < 180 ? 'valgus' : 'varus';
        const rightKneeType = rightKneeAngle < 180 ? 'valgus' : 'varus';

        if (leftKneeDeviation > 8 || rightKneeDeviation > 8) {
            issues.push(`Knee alignment: Left ${leftKneeDeviation.toFixed(1)}° ${leftKneeType}, Right ${rightKneeDeviation.toFixed(1)}° ${rightKneeType} (Normal: <8° deviation from straight)`);
            recommendations.push('• Hip abductor strengthening');
            recommendations.push('• Knee tracking exercises');
        }

        // 7. KNEE LEVEL
        const kneeAngle = this.calculateSlopeAngle(leftKnee, rightKnee);
        measurements.kneeLevel = kneeAngle.toFixed(1);
        const kneeHeightDiffPx = Math.abs(leftKnee.y - rightKnee.y);
        measurements.kneeLevelCm = (kneeHeightDiffPx * hipRatio).toFixed(1);

        if (kneeAngle > 2) {
            const higherKnee = leftKnee.y < rightKnee.y ? 'left' : 'right';
            issues.push(`Knee height asymmetry: ${kneeAngle.toFixed(1)}° tilt (${measurements.kneeLevelCm} cm), ${higherKnee} knee higher (Normal: <2° or <1.5 cm)`);
            recommendations.push('• Functional leg length assessment');
        }

        if (issues.length === 0) {
            issues.push('✓ Normal frontal plane alignment');
        }

        return { issues, recommendations, measurements };
    },

    // Enhanced Side View Analysis with User Calibration
    analyzeSideView(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            return { issues: [], recommendations: [], measurements: {} };
        }

        const issues = [];
        const recommendations = [];
        const measurements = {};

        const leftEar = landmarks[7];
        const rightEar = landmarks[8];
        const nose = landmarks[0];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];

        const earAvg = leftEar && rightEar ? 
            { x: (leftEar.x + rightEar.x) / 2, y: (leftEar.y + rightEar.y) / 2 } : 
            leftEar || rightEar || nose;

        const shoulderAvg = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };

        const hipAvg = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };

        const kneeAvg = {
            x: (leftKnee.x + rightKnee.x) / 2,
            y: (leftKnee.y + rightKnee.y) / 2
        };

        const ankleAvg = {
            x: (leftAnkle.x + rightAnkle.x) / 2,
            y: (leftAnkle.y + rightAnkle.y) / 2
        };

        // Use USER CALIBRATION for neck length
        const NECK_LENGTH_CM = this.userCalibration.neckLength;

        // 1. FORWARD NECK POSTURE
        const neckForwardAngle = this.calculateHorizontalDeviation(shoulderAvg, earAvg);
        measurements.forwardNeck = neckForwardAngle.toFixed(1);
        const neckVerticalDistPx = Math.abs(earAvg.y - shoulderAvg.y);
        const neckHorizontalDistPx = Math.abs(earAvg.x - shoulderAvg.x);
        const neckRatio = neckVerticalDistPx > 0 ? NECK_LENGTH_CM / neckVerticalDistPx : 0.3;
        measurements.forwardNeckCm = (neckHorizontalDistPx * neckRatio).toFixed(1);

        // 2. CHIN FORWARD
        const chinForwardAngle = this.calculateHorizontalDeviation(shoulderAvg, nose);
        measurements.chinForward = chinForwardAngle.toFixed(1);
        const chinVerticalDistPx = Math.abs(nose.y - shoulderAvg.y);
        const chinHorizontalDistPx = Math.abs(nose.x - shoulderAvg.x);
        const chinRatio = chinVerticalDistPx > 0 ? NECK_LENGTH_CM / chinVerticalDistPx : 0.3;
        measurements.chinForwardCm = (chinHorizontalDistPx * chinRatio).toFixed(1);

        if (neckForwardAngle > 15 || chinForwardAngle > 12) {
            issues.push(`Forward head posture: Neck ${neckForwardAngle.toFixed(1)}° (${measurements.forwardNeckCm} cm), Chin ${chinForwardAngle.toFixed(1)}° (${measurements.chinForwardCm} cm) forward (Normal: <15°/<12°)`);
            recommendations.push('• Deep neck flexor strengthening');
            recommendations.push('• Postural awareness training');
        }

        // 3. SHOULDER POSITION
        const shoulderToHipAngle = this.calculateAngle(earAvg, shoulderAvg, hipAvg);
        const shoulderDeviation = Math.abs(180 - shoulderToHipAngle);
        const shoulderPosture = shoulderToHipAngle < 180 ? 'rounded' : 'retracted';
        measurements.shoulderPosition = shoulderDeviation.toFixed(1);
        measurements.shoulderPostureType = shoulderPosture;

        if (shoulderDeviation > 10) {
            issues.push(`Shoulder position: ${shoulderDeviation.toFixed(1)}° ${shoulderPosture} (Normal: <10° from vertical)`);
            if (shoulderPosture === 'rounded') {
                recommendations.push('•Scapular retraction exercises');
                recommendations.push('• Pectoralis stretching');
            }
        }

        // 4. THORACIC CURVATURE
        const thoracicAngle = this.calculateAngle(earAvg, shoulderAvg, hipAvg);
        const kyphosisAngle = thoracicAngle < 180 ? (180 - thoracicAngle) : 0;
        measurements.thoracicCurvature = kyphosisAngle.toFixed(1);
        
        if (kyphosisAngle > 40) {
            measurements.thoracicCurvatureType = 'Excessive kyphosis';
            issues.push(`Excessive thoracic kyphosis: ${kyphosisAngle.toFixed(1)}° (Normal: 20-40°)`);
            recommendations.push('• Thoracic extension mobilization');
            recommendations.push('• Upper back strengthening');
        } else if (kyphosisAngle < 20) {
            measurements.thoracicCurvatureType = 'Reduced kyphosis';
            issues.push(`Reduced thoracic kyphosis: ${kyphosisAngle.toFixed(1)}° (Normal: 20-40°)`);
            recommendations.push('• Thoracic mobility exercises');
        } else {
            measurements.thoracicCurvatureType = 'Normal';
        }

        // 5. LUMBAR CURVATURE
        const lumbarAngle = this.calculateAngle(shoulderAvg, hipAvg, kneeAvg);
        const lordosisAngle = lumbarAngle > 180 ? (lumbarAngle - 180) : 0;
        measurements.lumbarCurvature = lordosisAngle.toFixed(1);

        if (lordosisAngle > 60) {
            measurements.lumbarCurvatureType = 'Excessive lordosis';
            issues.push(`Excessive lumbar lordosis: ${lordosisAngle.toFixed(1)}° (Normal: 40-60°)`);
            recommendations.push('• Hip flexor stretching');
            recommendations.push('• Core strengthening');
        } else if (lordosisAngle < 40) {
            measurements.lumbarCurvatureType = 'Reduced lordosis';
            issues.push(`Reduced lumbar lordosis: ${lordosisAngle.toFixed(1)}° (Normal: 40-60°)`);
            recommendations.push('• Lumbar extension mobility');
        } else {
            measurements.lumbarCurvatureType = 'Normal';
        }

        // 6. KNEE POSITION
        const kneeAngle = this.calculateAngle(hipAvg, kneeAvg, ankleAvg);
        const kneeDeviation = Math.abs(180 - kneeAngle);
        const kneePosition = kneeAngle < 180 ? 'flexion' : 'hyperextension';
        measurements.kneePosition = kneeDeviation.toFixed(1);
        measurements.kneePositionType = kneePosition;

        if (kneeDeviation > 5) {
            issues.push(`Knee ${kneePosition}: ${kneeDeviation.toFixed(1)}° from neutral (Normal: <5°)`);
            if (kneePosition === 'flexion') {
                recommendations.push('• Quadriceps strengthening');
            } else {
                recommendations.push('• Hamstring strengthening');
            }
        }

        if (issues.length === 0) {
            issues.push('✓ Normal sagittal plane alignment');
        }

        return { issues, recommendations, measurements };
    },

    // Enhanced Back View Analysis with User Calibration
    analyzeBackView(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            return { issues: [], recommendations: [], measurements: {} };
        }

        const issues = [];
        const recommendations = [];
        const measurements = {};

        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];

        // Use USER CALIBRATION VALUES
        const SHOULDER_WIDTH_CM = this.userCalibration.shoulderWidth;
        const HIP_WIDTH_CM = this.userCalibration.hipWidth;

        const shoulderDistancePx = Math.sqrt(Math.pow(rightShoulder.x - leftShoulder.x, 2) + Math.pow(rightShoulder.y - leftShoulder.y, 2));
        const hipDistancePx = Math.sqrt(Math.pow(rightHip.x - leftHip.x, 2) + Math.pow(rightHip.y - leftHip.y, 2));

        const shoulderRatio = SHOULDER_WIDTH_CM / shoulderDistancePx;
        const hipRatio = HIP_WIDTH_CM / hipDistancePx;

        // 1. ELBOW LEVEL
        const elbowAngle = this.calculateSlopeAngle(leftElbow, rightElbow);
        measurements.elbowLevel = elbowAngle.toFixed(1);
        const elbowHeightDiffPx = Math.abs(leftElbow.y - rightElbow.y);
        measurements.elbowLevelCm = (elbowHeightDiffPx * shoulderRatio).toFixed(1);

        if (elbowAngle > 3) {
            const higherElbow = leftElbow.y < rightElbow.y ? 'left' : 'right';
            issues.push(`Elbow asymmetry: ${elbowAngle.toFixed(1)}° tilt (${measurements.elbowLevelCm} cm), ${higherElbow} elevated (Normal: <3° or <2 cm)`);
            recommendations.push('• Upper extremity muscle balance');
        }

        // 2. SCAPULAR LEVEL
        const scapularAngle = this.calculateSlopeAngle(leftShoulder, rightShoulder);
        measurements.scapularLevel = scapularAngle.toFixed(1);
        const scapularHeightDiffPx = Math.abs(leftShoulder.y - rightShoulder.y);
        measurements.scapularLevelCm = (scapularHeightDiffPx * shoulderRatio).toFixed(1);

        if (scapularAngle > 2) {
            const higherScapula = leftShoulder.y < rightShoulder.y ? 'left' : 'right';
            issues.push(`Scapular height asymmetry: ${scapularAngle.toFixed(1)}° tilt (${measurements.scapularLevelCm} cm), ${higherScapula} elevated (Normal: <2° or <1.5 cm)`);
            recommendations.push('• Scapular stabilization exercises');
        }

        // 3. PSIS LEVEL
        const psisAngle = this.calculateSlopeAngle(leftHip, rightHip);
        measurements.psisLevel = psisAngle.toFixed(1);
        const psisHeightDiffPx = Math.abs(leftHip.y - rightHip.y);
        measurements.psisLevelCm = (psisHeightDiffPx * hipRatio).toFixed(1);

        if (psisAngle > 2) {
            const higherPSIS = leftHip.y < rightHip.y ? 'left' : 'right';
            issues.push(`PSIS asymmetry: ${psisAngle.toFixed(1)}° tilt (${measurements.psisLevelCm} cm), ${higherPSIS} elevated (Normal: <2° or <1.5 cm)`);
            recommendations.push('• Pelvic rotation assessment');
        }

        // 4. GLUTEAL FOLD
        const leftGlutealLength = Math.sqrt(Math.pow(leftKnee.x - leftHip.x, 2) + Math.pow(leftKnee.y - leftHip.y, 2));
        const rightGlutealLength = Math.sqrt(Math.pow(rightKnee.x - rightHip.x, 2) + Math.pow(rightKnee.y - rightHip.y, 2));
        const glutealAsymmetry = Math.abs(leftGlutealLength - rightGlutealLength) / ((leftGlutealLength + rightGlutealLength) / 2) * 100;
        measurements.glutealFoldAsymmetry = glutealAsymmetry.toFixed(1);

        if (glutealAsymmetry > 3) {
            const longerSide = leftGlutealLength > rightGlutealLength ? 'left' : 'right';
            issues.push(`Gluteal fold asymmetry: ${glutealAsymmetry.toFixed(1)}%, ${longerSide} side (Normal: <3%)`);
            recommendations.push('• Gluteal strengthening');
        }

        // 5. POPLITEAL LINE
        const poplitealAngle = this.calculateSlopeAngle(leftKnee, rightKnee);
        measurements.poplitealLine = poplitealAngle.toFixed(1);
        const poplitealHeightDiffPx = Math.abs(leftKnee.y - rightKnee.y);
        measurements.poplitealLineCm = (poplitealHeightDiffPx * hipRatio).toFixed(1);

        if (poplitealAngle > 2) {
            const higherKnee = leftKnee.y < rightKnee.y ? 'left' : 'right';
            issues.push(`Popliteal asymmetry: ${poplitealAngle.toFixed(1)}° tilt (${measurements.poplitealLineCm} cm), ${higherKnee} higher (Normal: <2° or <1.5 cm)`);
            recommendations.push('• Hamstring flexibility assessment');
        }

        if (issues.length === 0) {
            issues.push('✓ Normal posterior alignment');
        }

        return { issues, recommendations, measurements };
    },

    analyzePosture() {
        const analysis = {
            front: this.analyzeFrontView(AppState.capturedData.frontLandmarks),
            side: this.analyzeSideView(AppState.capturedData.sideLandmarks),
            back: this.analyzeBackView(AppState.capturedData.backLandmarks)
        };

        AppState.postureAnalysis = analysis;
        console.log('Posture analysis completed with user calibration:', analysis);
    },

    analyzeUploadedPosture() {
        const analysis = {
            front: this.analyzeFrontView(AppState.uploadedData.frontLandmarks),
            side: this.analyzeSideView(AppState.uploadedData.sideLandmarks),
            back: this.analyzeBackView(AppState.uploadedData.backLandmarks)
        };

        AppState.postureAnalysis = analysis;
        console.log('Uploaded posture analysis completed with user calibration:', analysis);
    },

    generateExerciseProtocol(analysis) {
        const exercises = [];
        const schedule = [];

        if (analysis.front?.issues.some(issue => !issue.includes('✓')) ||
            analysis.side?.issues.some(issue => !issue.includes('✓')) ||
            analysis.back?.issues.some(issue => !issue.includes('✓'))) {
            
            exercises.push('Corrective Exercise Protocol:');
            exercises.push('• Postural awareness training: Daily');
            exercises.push('• Core stabilization: 3 sets x 45 seconds, 5x/week');
            exercises.push('• Shoulder blade squeezes: 3 sets x 12 reps, 5x/week');
            exercises.push('• Hip bridges: 3 sets x 10 reps, 4x/week');
            schedule.push('Follow prescribed exercises consistently for 6-8 weeks');
        } else {
            exercises.push('Maintenance Protocol:');
            exercises.push('• Continue general postural awareness');
            schedule.push('General maintenance: 2-3 times per week');
        }

        return {
            exercises: exercises.join('\n'),
            schedule: schedule.join('\n')
        };
    }
};

// Initialize calibration event listeners when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    const saveCalibrationBtn = document.getElementById('saveCalibrationBtn');
    const useDefaultsBtn = document.getElementById('useDefaultsBtn');
    const calibrationStatus = document.getElementById('calibrationStatus');
    
    if (saveCalibrationBtn) {
        saveCalibrationBtn.addEventListener('click', function() {
            const headWidth = parseFloat(document.getElementById('headWidth').value) || 15;
            const shoulderWidth = parseFloat(document.getElementById('shoulderWidth').value) || 40;
            const hipWidth = parseFloat(document.getElementById('hipWidth').value) || 35;
            const neckLength = parseFloat(document.getElementById('neckLength').value) || 20;
            
            AnalysisEngine.setCalibration(headWidth, shoulderWidth, hipWidth, neckLength);
            
            calibrationStatus.className = 'calibration-status success';
            calibrationStatus.textContent = `✓ Calibration saved: Head ${headWidth}cm, Shoulder ${shoulderWidth}cm, Hip ${hipWidth}cm, Neck ${neckLength}cm`;
            calibrationStatus.classList.remove('hidden');
            
            setTimeout(() => {
                calibrationStatus.classList.add('hidden');
            }, 5000);
        });
    }
    
    if (useDefaultsBtn) {
        useDefaultsBtn.addEventListener('click', function() {
            AnalysisEngine.setCalibration(15, 40, 35, 20);
            
            document.getElementById('headWidth').value = '';
            document.getElementById('shoulderWidth').value = '';
            document.getElementById('hipWidth').value = '';
            document.getElementById('neckLength').value = '';
            
            calibrationStatus.className = 'calibration-status info';
            calibrationStatus.textContent = 'ℹ Default values loaded: Head 15cm, Shoulder 40cm, Hip 35cm, Neck 20cm';
            calibrationStatus.classList.remove('hidden');
            
            setTimeout(() => {
                calibrationStatus.classList.add('hidden');
            }, 5000);
        });
    }
});

console.log('Clinical Analysis Engine loaded with User Calibration Support');