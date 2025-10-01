// analysis-engine.js - Clinical Posture Analysis with Enhanced Knee Analysis

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

    // Enhanced Front View Analysis with Detailed Knee Valgus/Varus Detection
    analyzeFrontView(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            return { issues: [], recommendations: [], measurements: {}, deformities: [] };
        }

        const issues = [];
        const recommendations = [];
        const measurements = {};
        const deformities = [];

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
        const hipDistancePx = Math.sqrt(Math.pow(rightHip.x - leftHip.x, 2) + Math.pow(rightHip.y - rightHip.y, 2));

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
            const higherEar = leftEar.y < rightEar.y ? 'LEFT' : 'RIGHT';
            const lowerEar = leftEar.y < rightEar.y ? 'RIGHT' : 'LEFT';
            
            deformities.push({
                type: 'Ear Pinnae Asymmetry',
                elevated: higherEar,
                depressed: lowerEar,
                angle: earAngle.toFixed(1),
                distance: measurements.earPinnaeLevelCm
            });
            
            issues.push(`⚠ Ear pinnae asymmetry: ${higherEar} ear ELEVATED by ${measurements.earPinnaeLevelCm}cm (${earAngle.toFixed(1)}°), ${lowerEar} ear DEPRESSED (Normal: <3° or <1cm)`);
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
            const side = nose.x < shoulderMidpoint.x ? 'LEFT' : 'RIGHT';
            
            deformities.push({
                type: 'Cervical Lateral Deviation',
                direction: side,
                angle: neckDeviation.toFixed(1),
                distance: measurements.neckLevelCm
            });
            
            issues.push(`⚠ Cervical lateral deviation: Head shifted ${measurements.neckLevelCm}cm (${neckDeviation.toFixed(1)}°) to the ${side} (Normal: <5° or <1.5cm)`);
            recommendations.push('• Cervical lateral flexion stretching');
            recommendations.push('• Sternocleidomastoid and scalene muscle balancing');
        }

        // 3. SHOULDER LEVEL
        const shoulderAngle = this.calculateSlopeAngle(leftShoulder, rightShoulder);
        measurements.shoulderLevel = shoulderAngle.toFixed(1);
        const shoulderHeightDiffPx = Math.abs(leftShoulder.y - rightShoulder.y);
        measurements.shoulderLevelCm = (shoulderHeightDiffPx * shoulderRatio).toFixed(1);

        if (shoulderAngle > 2) {
            const higherSide = leftShoulder.y < rightShoulder.y ? 'LEFT' : 'RIGHT';
            const lowerSide = leftShoulder.y < rightShoulder.y ? 'RIGHT' : 'LEFT';
            
            deformities.push({
                type: 'Shoulder Level Asymmetry',
                elevated: higherSide,
                depressed: lowerSide,
                angle: shoulderAngle.toFixed(1),
                distance: measurements.shoulderLevelCm
            });
            
            issues.push(`⚠ Shoulder asymmetry: ${higherSide} shoulder ELEVATED by ${measurements.shoulderLevelCm}cm (${shoulderAngle.toFixed(1)}°), ${lowerSide} shoulder DEPRESSED (Normal: <2° or <1.5cm)`);
            recommendations.push(`• Upper trapezius stretching on ${higherSide} side`);
            recommendations.push(`• Lower trapezius strengthening on ${lowerSide} side`);
        }

        // 4. ELBOW LEVEL
        const elbowAngle = this.calculateSlopeAngle(leftElbow, rightElbow);
        measurements.elbowLevel = elbowAngle.toFixed(1);
        const elbowHeightDiffPx = Math.abs(leftElbow.y - rightElbow.y);
        measurements.elbowLevelCm = (elbowHeightDiffPx * shoulderRatio).toFixed(1);

        if (elbowAngle > 3) {
            const higherElbow = leftElbow.y < rightElbow.y ? 'LEFT' : 'RIGHT';
            const lowerElbow = leftElbow.y < rightElbow.y ? 'RIGHT' : 'LEFT';
            
            deformities.push({
                type: 'Elbow Level Asymmetry',
                elevated: higherElbow,
                depressed: lowerElbow,
                angle: elbowAngle.toFixed(1),
                distance: measurements.elbowLevelCm
            });
            
            issues.push(`⚠ Elbow asymmetry: ${higherElbow} elbow ELEVATED by ${measurements.elbowLevelCm}cm (${elbowAngle.toFixed(1)}°), ${lowerElbow} elbow DEPRESSED (Normal: <3° or <2cm)`);
            recommendations.push('• Assess shoulder girdle complex');
        }

        // 5. PELVIC OBLIQUITY
        const hipAngle = this.calculateSlopeAngle(leftHip, rightHip);
        measurements.pelvicObliquity = hipAngle.toFixed(1);
        const hipHeightDiffPx = Math.abs(leftHip.y - rightHip.y);
        measurements.pelvicObliquityCm = (hipHeightDiffPx * hipRatio).toFixed(1);

        if (hipAngle > 2) {
            const higherHip = leftHip.y < rightHip.y ? 'LEFT' : 'RIGHT';
            const lowerHip = leftHip.y < rightHip.y ? 'RIGHT' : 'LEFT';
            
            deformities.push({
                type: 'Pelvic Obliquity',
                elevated: higherHip,
                depressed: lowerHip,
                angle: hipAngle.toFixed(1),
                distance: measurements.pelvicObliquityCm
            });
            
            issues.push(`⚠ Pelvic obliquity: ${higherHip} iliac crest ELEVATED by ${measurements.pelvicObliquityCm}cm (${hipAngle.toFixed(1)}°), ${lowerHip} iliac crest DEPRESSED (Normal: <2° or <1.5cm)`);
            recommendations.push('• Leg length discrepancy assessment required');
            recommendations.push(`• Hip abductor strengthening on ${lowerHip} side`);
        }

        // 6. ENHANCED KNEE ALIGNMENT - VALGUS (INWARD) / VARUS (OUTWARD) DETECTION
        // Left Knee Analysis
        const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const leftKneeDeviation = Math.abs(180 - leftKneeAngle);
        
        // Determine if knee is valgus (knocked knees - inward) or varus (bow-legged - outward)
        // In front view: if knee angle < 180, knees point inward (valgus)
        //                if knee angle > 180, knees point outward (varus)
        let leftKneeDirection = '';
        if (leftKneeAngle < 180) {
            leftKneeDirection = 'VALGUS (INWARD/KNOCKED)';
        } else if (leftKneeAngle > 180) {
            leftKneeDirection = 'VARUS (OUTWARD/BOW-LEGGED)';
        }
        
        measurements.leftKneeAlignment = leftKneeDeviation.toFixed(1);
        measurements.leftKneeDirection = leftKneeDirection;

        // Right Knee Analysis
        const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        const rightKneeDeviation = Math.abs(180 - rightKneeAngle);
        
        let rightKneeDirection = '';
        if (rightKneeAngle < 180) {
            rightKneeDirection = 'VALGUS (INWARD/KNOCKED)';
        } else if (rightKneeAngle > 180) {
            rightKneeDirection = 'VARUS (OUTWARD/BOW-LEGGED)';
        }
        
        measurements.rightKneeAlignment = rightKneeDeviation.toFixed(1);
        measurements.rightKneeDirection = rightKneeDirection;

        if (leftKneeDeviation > 8 || rightKneeDeviation > 8) {
            let kneeIssue = '⚠ Knee alignment: ';
            
            if (leftKneeDeviation > 8) {
                kneeIssue += `LEFT knee ${leftKneeDirection} ${leftKneeDeviation.toFixed(1)}° `;
                deformities.push({
                    type: 'Left Knee Malalignment',
                    direction: leftKneeDirection,
                    angle: leftKneeDeviation.toFixed(1),
                    side: 'LEFT'
                });
            }
            
            if (rightKneeDeviation > 8) {
                if (leftKneeDeviation > 8) kneeIssue += '| ';
                kneeIssue += `RIGHT knee ${rightKneeDirection} ${rightKneeDeviation.toFixed(1)}° `;
                deformities.push({
                    type: 'Right Knee Malalignment',
                    direction: rightKneeDirection,
                    angle: rightKneeDeviation.toFixed(1),
                    side: 'RIGHT'
                });
            }
            
            kneeIssue += '(Normal: <8° deviation from straight)';
            issues.push(kneeIssue);
            
            if (leftKneeDirection.includes('VALGUS') || rightKneeDirection.includes('VALGUS')) {
                recommendations.push('• Hip abductor strengthening for valgus correction');
                recommendations.push('• VMO (Vastus Medialis Oblique) strengthening');
            }
            if (leftKneeDirection.includes('VARUS') || rightKneeDirection.includes('VARUS')) {
                recommendations.push('• Hip adductor strengthening for varus correction');
                recommendations.push('• ITB (Iliotibial Band) stretching');
            }
        }

        // 7. KNEE LEVEL
        const kneeAngle = this.calculateSlopeAngle(leftKnee, rightKnee);
        measurements.kneeLevel = kneeAngle.toFixed(1);
        const kneeHeightDiffPx = Math.abs(leftKnee.y - rightKnee.y);
        measurements.kneeLevelCm = (kneeHeightDiffPx * hipRatio).toFixed(1);

        if (kneeAngle > 2) {
            const higherKnee = leftKnee.y < rightKnee.y ? 'LEFT' : 'RIGHT';
            const lowerKnee = leftKnee.y < rightKnee.y ? 'RIGHT' : 'LEFT';
            
            deformities.push({
                type: 'Knee Height Asymmetry',
                elevated: higherKnee,
                depressed: lowerKnee,
                angle: kneeAngle.toFixed(1),
                distance: measurements.kneeLevelCm
            });
            
            issues.push(`⚠ Knee height asymmetry: ${higherKnee} knee ELEVATED by ${measurements.kneeLevelCm}cm (${kneeAngle.toFixed(1)}°), ${lowerKnee} knee DEPRESSED (Normal: <2° or <1.5cm)`);
            recommendations.push('• Functional leg length assessment');
        }

        if (issues.length === 0) {
            issues.push('✓ Normal frontal plane alignment');
        }

        return { issues, recommendations, measurements, deformities };
    },

    // Enhanced Side View Analysis with Individual Left/Right Knee Flexion/Extension
    analyzeSideView(landmarks, side = 'unknown') {
        if (!landmarks || landmarks.length === 0) {
            return { issues: [], recommendations: [], measurements: {}, deformities: [] };
        }

        const issues = [];
        const recommendations = [];
        const measurements = {};
        const deformities = [];

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
            deformities.push({
                type: 'Forward Head Posture',
                direction: 'ANTERIOR',
                neckAngle: neckForwardAngle.toFixed(1),
                neckDistance: measurements.forwardNeckCm,
                chinAngle: chinForwardAngle.toFixed(1),
                chinDistance: measurements.chinForwardCm
            });
            
            issues.push(`⚠ Forward head posture: Head positioned ANTERIORLY - Neck ${measurements.forwardNeckCm}cm (${neckForwardAngle.toFixed(1)}°), Chin ${measurements.chinForwardCm}cm (${chinForwardAngle.toFixed(1)}°) forward of shoulders (Normal: <15°/<12°)`);
            recommendations.push('• Deep neck flexor strengthening');
            recommendations.push('• Postural awareness training');
        }

        // 3. SHOULDER POSITION
        const shoulderToHipAngle = this.calculateAngle(earAvg, shoulderAvg, hipAvg);
        const shoulderDeviation = Math.abs(180 - shoulderToHipAngle);
        const shoulderPosture = shoulderToHipAngle < 180 ? 'ROUNDED (ANTERIOR)' : 'RETRACTED (POSTERIOR)';
        measurements.shoulderPosition = shoulderDeviation.toFixed(1);
        measurements.shoulderPostureType = shoulderPosture;

        if (shoulderDeviation > 10) {
            deformities.push({
                type: 'Shoulder Position Deviation',
                direction: shoulderPosture,
                angle: shoulderDeviation.toFixed(1)
            });
            
            issues.push(`⚠ Shoulder position: Shoulders ${shoulderPosture} by ${shoulderDeviation.toFixed(1)}° (Normal: <10° from vertical)`);
            if (shoulderPosture.includes('ANTERIOR')) {
                recommendations.push('• Scapular retraction exercises');
                recommendations.push('• Pectoralis stretching');
            }
        }

        // 4. THORACIC CURVATURE
        const thoracicAngle = this.calculateAngle(earAvg, shoulderAvg, hipAvg);
        const kyphosisAngle = thoracicAngle < 180 ? (180 - thoracicAngle) : 0;
        measurements.thoracicCurvature = kyphosisAngle.toFixed(1);
        
        if (kyphosisAngle > 40) {
            measurements.thoracicCurvatureType = 'EXCESSIVE KYPHOSIS';
            deformities.push({
                type: 'Thoracic Curvature',
                direction: 'EXCESSIVE KYPHOSIS (POSTERIOR CONVEXITY)',
                angle: kyphosisAngle.toFixed(1)
            });
            
            issues.push(`⚠ Excessive thoracic kyphosis: POSTERIOR CONVEXITY ${kyphosisAngle.toFixed(1)}° (Normal: 20-40°)`);
            recommendations.push('• Thoracic extension mobilization');
            recommendations.push('• Upper back strengthening');
        } else if (kyphosisAngle < 20) {
            measurements.thoracicCurvatureType = 'REDUCED KYPHOSIS (FLAT BACK)';
            deformities.push({
                type: 'Thoracic Curvature',
                direction: 'REDUCED KYPHOSIS (FLAT BACK)',
                angle: kyphosisAngle.toFixed(1)
            });
            
            issues.push(`⚠ Reduced thoracic kyphosis: FLAT BACK ${kyphosisAngle.toFixed(1)}° (Normal: 20-40°)`);
            recommendations.push('• Thoracic mobility exercises');
        } else {
            measurements.thoracicCurvatureType = 'Normal';
        }

        // 5. LUMBAR CURVATURE
        const lumbarAngle = this.calculateAngle(shoulderAvg, hipAvg, {
            x: (leftKnee.x + rightKnee.x) / 2,
            y: (leftKnee.y + rightKnee.y) / 2
        });
        const lordosisAngle = lumbarAngle > 180 ? (lumbarAngle - 180) : 0;
        measurements.lumbarCurvature = lordosisAngle.toFixed(1);

        if (lordosisAngle > 60) {
            measurements.lumbarCurvatureType = 'EXCESSIVE LORDOSIS';
            deformities.push({
                type: 'Lumbar Curvature',
                direction: 'EXCESSIVE LORDOSIS (ANTERIOR CONVEXITY)',
                angle: lordosisAngle.toFixed(1)
            });
            
            issues.push(`⚠ Excessive lumbar lordosis: ANTERIOR CONVEXITY ${lordosisAngle.toFixed(1)}° (Normal: 40-60°)`);
            recommendations.push('• Hip flexor stretching');
            recommendations.push('• Core strengthening');
        } else if (lordosisAngle < 40) {
            measurements.lumbarCurvatureType = 'REDUCED LORDOSIS (FLAT LUMBAR)';
            deformities.push({
                type: 'Lumbar Curvature',
                direction: 'REDUCED LORDOSIS (FLAT LUMBAR)',
                angle: lordosisAngle.toFixed(1)
            });
            
            issues.push(`⚠ Reduced lumbar lordosis: FLAT LUMBAR SPINE ${lordosisAngle.toFixed(1)}° (Normal: 40-60°)`);
            recommendations.push('• Lumbar extension mobility');
        } else {
            measurements.lumbarCurvatureType = 'Normal';
        }

        // 6. ENHANCED KNEE POSITION - INDIVIDUAL LEFT AND RIGHT ANALYSIS
        // Left Knee Flexion/Extension
        const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const leftKneeDeviation = Math.abs(180 - leftKneeAngle);
        
        let leftKneePosition = '';
        if (leftKneeAngle < 180) {
            leftKneePosition = 'FLEXION';
        } else if (leftKneeAngle > 180) {
            leftKneePosition = 'HYPEREXTENSION (RECURVATUM)';
        } else {
            leftKneePosition = 'NEUTRAL';
        }
        
        measurements.leftKneePosition = leftKneeDeviation.toFixed(1);
        measurements.leftKneePositionType = leftKneePosition;

        // Right Knee Flexion/Extension
        const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        const rightKneeDeviation = Math.abs(180 - rightKneeAngle);
        
        let rightKneePosition = '';
        if (rightKneeAngle < 180) {
            rightKneePosition = 'FLEXION';
        } else if (rightKneeAngle > 180) {
            rightKneePosition = 'HYPEREXTENSION (RECURVATUM)';
        } else {
            rightKneePosition = 'NEUTRAL';
        }
        
        measurements.rightKneePosition = rightKneeDeviation.toFixed(1);
        measurements.rightKneePositionType = rightKneePosition;

        // Report issues for each knee separately
        if (leftKneeDeviation > 5) {
            deformities.push({
                type: 'Left Knee Position',
                direction: leftKneePosition,
                angle: leftKneeDeviation.toFixed(1),
                side: 'LEFT'
            });
            
            issues.push(`⚠ LEFT knee ${leftKneePosition}: ${leftKneeDeviation.toFixed(1)}° from neutral (Normal: <5°)`);
            
            if (leftKneePosition === 'FLEXION') {
                recommendations.push('• LEFT quadriceps strengthening');
                recommendations.push('• LEFT hamstring stretching');
            } else if (leftKneePosition.includes('HYPEREXTENSION')) {
                recommendations.push('• LEFT hamstring strengthening');
                recommendations.push('• LEFT knee proprioception training');
            }
        }

        if (rightKneeDeviation > 5) {
            deformities.push({
                type: 'Right Knee Position',
                direction: rightKneePosition,
                angle: rightKneeDeviation.toFixed(1),
                side: 'RIGHT'
            });
            
            issues.push(`⚠ RIGHT knee ${rightKneePosition}: ${rightKneeDeviation.toFixed(1)}° from neutral (Normal: <5°)`);
            
            if (rightKneePosition === 'FLEXION') {
                recommendations.push('• RIGHT quadriceps strengthening');
                recommendations.push('• RIGHT hamstring stretching');
            } else if (rightKneePosition.includes('HYPEREXTENSION')) {
                recommendations.push('• RIGHT hamstring strengthening');
                recommendations.push('• RIGHT knee proprioception training');
            }
        }

        if (issues.length === 0) {
            issues.push('✓ Normal sagittal plane alignment');
        }

        return { issues, recommendations, measurements, deformities };
    },

    // Enhanced Back View Analysis with Directional Information
    // Enhanced Back View Analysis with Ankle Pronation/Supination Detection
analyzeBackView(landmarks) {
    if (!landmarks || landmarks.length === 0) {
        return { issues: [], recommendations: [], measurements: {}, deformities: [] };
    }

    const issues = [];
    const recommendations = [];
    const measurements = {};
    const deformities = [];

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
    const leftHeel = landmarks[29];
    const rightHeel = landmarks[30];
    const leftFootIndex = landmarks[31];
    const rightFootIndex = landmarks[32];

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
        const higherElbow = leftElbow.y < rightElbow.y ? 'LEFT' : 'RIGHT';
        const lowerElbow = leftElbow.y < rightElbow.y ? 'RIGHT' : 'LEFT';
        
        deformities.push({
            type: 'Elbow Level Asymmetry',
            elevated: higherElbow,
            depressed: lowerElbow,
            angle: elbowAngle.toFixed(1),
            distance: measurements.elbowLevelCm
        });
        
        issues.push(`⚠ Elbow asymmetry: ${higherElbow} elbow ELEVATED by ${measurements.elbowLevelCm}cm (${elbowAngle.toFixed(1)}°), ${lowerElbow} elbow DEPRESSED (Normal: <3° or <2cm)`);
        recommendations.push('• Upper extremity muscle balance');
    }

    // 2. SCAPULAR LEVEL
    const scapularAngle = this.calculateSlopeAngle(leftShoulder, rightShoulder);
    measurements.scapularLevel = scapularAngle.toFixed(1);
    const scapularHeightDiffPx = Math.abs(leftShoulder.y - rightShoulder.y);
    measurements.scapularLevelCm = (scapularHeightDiffPx * shoulderRatio).toFixed(1);

    if (scapularAngle > 2) {
        const higherScapula = leftShoulder.y < rightShoulder.y ? 'LEFT' : 'RIGHT';
        const lowerScapula = leftShoulder.y < rightShoulder.y ? 'RIGHT' : 'LEFT';
        
        deformities.push({
            type: 'Scapular Height Asymmetry',
            elevated: higherScapula,
            depressed: lowerScapula,
            angle: scapularAngle.toFixed(1),
            distance: measurements.scapularLevelCm
        });
        
        issues.push(`⚠ Scapular asymmetry: ${higherScapula} scapula ELEVATED by ${measurements.scapularLevelCm}cm (${scapularAngle.toFixed(1)}°), ${lowerScapula} scapula DEPRESSED (Normal: <2° or <1.5cm)`);
        recommendations.push('• Scapular stabilization exercises');
        recommendations.push(`• Focus on ${lowerScapula} side elevation exercises`);
    }

    // 3. PSIS LEVEL
    const psisAngle = this.calculateSlopeAngle(leftHip, rightHip);
    measurements.psisLevel = psisAngle.toFixed(1);
    const psisHeightDiffPx = Math.abs(leftHip.y - rightHip.y);
    measurements.psisLevelCm = (psisHeightDiffPx * hipRatio).toFixed(1);

    if (psisAngle > 2) {
        const higherPSIS = leftHip.y < rightHip.y ? 'LEFT' : 'RIGHT';
        const lowerPSIS = leftHip.y < rightHip.y ? 'RIGHT' : 'LEFT';
        
        deformities.push({
            type: 'PSIS Asymmetry',
            elevated: higherPSIS,
            depressed: lowerPSIS,
            angle: psisAngle.toFixed(1),
            distance: measurements.psisLevelCm
        });
        
        issues.push(`⚠ PSIS asymmetry: ${higherPSIS} PSIS ELEVATED by ${measurements.psisLevelCm}cm (${psisAngle.toFixed(1)}°), ${lowerPSIS} PSIS DEPRESSED (Normal: <2° or <1.5cm)`);
        recommendations.push('• Pelvic rotation assessment');
        recommendations.push(`• Address pelvic rotation - ${higherPSIS} side posterior rotation`);
    }

    // 4. GLUTEAL FOLD
    const leftGlutealLength = Math.sqrt(Math.pow(leftKnee.x - leftHip.x, 2) + Math.pow(leftKnee.y - leftHip.y, 2));
    const rightGlutealLength = Math.sqrt(Math.pow(rightKnee.x - rightHip.x, 2) + Math.pow(rightKnee.y - rightHip.y, 2));
    const glutealAsymmetry = Math.abs(leftGlutealLength - rightGlutealLength) / ((leftGlutealLength + rightGlutealLength) / 2) * 100;
    measurements.glutealFoldAsymmetry = glutealAsymmetry.toFixed(1);

    if (glutealAsymmetry > 3) {
        const longerSide = leftGlutealLength > rightGlutealLength ? 'LEFT' : 'RIGHT';
        const shorterSide = leftGlutealLength > rightGlutealLength ? 'RIGHT' : 'LEFT';
        
        deformities.push({
            type: 'Gluteal Fold Asymmetry',
            longer: longerSide,
            shorter: shorterSide,
            percentage: glutealAsymmetry.toFixed(1)
        });
        
        issues.push(`⚠ Gluteal fold asymmetry: ${longerSide} side LONGER by ${glutealAsymmetry.toFixed(1)}%, ${shorterSide} side SHORTER (Normal: <3%)`);
        recommendations.push(`• Gluteal strengthening, focus on ${shorterSide} side`);
    }

    // 5. POPLITEAL LINE
    const poplitealAngle = this.calculateSlopeAngle(leftKnee, rightKnee);
    measurements.poplitealLine = poplitealAngle.toFixed(1);
    const poplitealHeightDiffPx = Math.abs(leftKnee.y - rightKnee.y);
    measurements.poplitealLineCm = (poplitealHeightDiffPx * hipRatio).toFixed(1);

    if (poplitealAngle > 2) {
        const higherKnee = leftKnee.y < rightKnee.y ? 'LEFT' : 'RIGHT';
        const lowerKnee = leftKnee.y < rightKnee.y ? 'RIGHT' : 'LEFT';
        
        deformities.push({
            type: 'Popliteal Line Asymmetry',
            elevated: higherKnee,
            depressed: lowerKnee,
            angle: poplitealAngle.toFixed(1),
            distance: measurements.poplitealLineCm
        });
        
        issues.push(`⚠ Popliteal asymmetry: ${higherKnee} knee ELEVATED by ${measurements.poplitealLineCm}cm (${poplitealAngle.toFixed(1)}°), ${lowerKnee} knee DEPRESSED (Normal: <2° or <1.5cm)`);
        recommendations.push('• Hamstring flexibility assessment');
    }

    // 6. NEW - ANKLE PRONATION/SUPINATION (INWARD/OUTWARD)
    // Left Ankle Analysis
    if (leftAnkle && leftHeel && leftFootIndex) {
        // Calculate the angle between knee-ankle-heel to determine ankle alignment
        const leftAnkleAngle = this.calculateAngle(leftKnee, leftAnkle, leftHeel);
        const leftAnkleDeviation = Math.abs(180 - leftAnkleAngle);
        
        let leftAnkleDirection = '';
        // If angle < 180, ankle rolls inward (pronation)
        // If angle > 180, ankle rolls outward (supination)
        if (leftAnkleAngle < 180) {
            leftAnkleDirection = 'PRONATION (INWARD)';
        } else if (leftAnkleAngle > 180) {
            leftAnkleDirection = 'SUPINATION (OUTWARD)';
        } else {
            leftAnkleDirection = 'NEUTRAL';
        }
        
        measurements.leftAnkleAlignment = leftAnkleDeviation.toFixed(1);
        measurements.leftAnkleDirection = leftAnkleDirection;

        if (leftAnkleDeviation > 5) {
            deformities.push({
                type: 'Left Ankle Malalignment',
                direction: leftAnkleDirection,
                angle: leftAnkleDeviation.toFixed(1),
                side: 'LEFT'
            });
        }
    }

    // Right Ankle Analysis
    if (rightAnkle && rightHeel && rightFootIndex) {
        const rightAnkleAngle = this.calculateAngle(rightKnee, rightAnkle, rightHeel);
        const rightAnkleDeviation = Math.abs(180 - rightAnkleAngle);
        
        let rightAnkleDirection = '';
        if (rightAnkleAngle < 180) {
            rightAnkleDirection = 'PRONATION (INWARD)';
        } else if (rightAnkleAngle > 180) {
            rightAnkleDirection = 'SUPINATION (OUTWARD)';
        } else {
            rightAnkleDirection = 'NEUTRAL';
        }
        
        measurements.rightAnkleAlignment = rightAnkleDeviation.toFixed(1);
        measurements.rightAnkleDirection = rightAnkleDirection;

        if (rightAnkleDeviation > 5) {
            deformities.push({
                type: 'Right Ankle Malalignment',
                direction: rightAnkleDirection,
                angle: rightAnkleDeviation.toFixed(1),
                side: 'RIGHT'
            });
        }
    }

    // Report ankle issues if significant
    const leftAnkleDev = measurements.leftAnkleAlignment ? parseFloat(measurements.leftAnkleAlignment) : 0;
    const rightAnkleDev = measurements.rightAnkleAlignment ? parseFloat(measurements.rightAnkleAlignment) : 0;

    if (leftAnkleDev > 5 || rightAnkleDev > 5) {
        let ankleIssue = '⚠ Ankle alignment: ';
        
        if (leftAnkleDev > 5) {
            ankleIssue += `LEFT ankle ${measurements.leftAnkleDirection} ${leftAnkleDev.toFixed(1)}° `;
        }
        
        if (rightAnkleDev > 5) {
            if (leftAnkleDev > 5) ankleIssue += '| ';
            ankleIssue += `RIGHT ankle ${measurements.rightAnkleDirection} ${rightAnkleDev.toFixed(1)}° `;
        }
        
        ankleIssue += '(Normal: <5° deviation)';
        issues.push(ankleIssue);
        
        if (measurements.leftAnkleDirection?.includes('PRONATION') || measurements.rightAnkleDirection?.includes('PRONATION')) {
            recommendations.push('• Ankle pronation control exercises');
            recommendations.push('• Posterior tibialis strengthening');
            recommendations.push('• Arch support assessment');
        }
        if (measurements.leftAnkleDirection?.includes('SUPINATION') || measurements.rightAnkleDirection?.includes('SUPINATION')) {
            recommendations.push('• Ankle supination correction exercises');
            recommendations.push('• Peroneal muscle strengthening');
            recommendations.push('• Lateral ankle stability training');
        }
    }

    if (issues.length === 0) {
        issues.push('✓ Normal posterior alignment');
    }

    return { issues, recommendations, measurements, deformities };
},

    analyzePosture() {
        const analysis = {
            front: this.analyzeFrontView(AppState.capturedData.frontLandmarks),
            sideLeft: this.analyzeSideView(AppState.capturedData.sideLeftLandmarks, 'left'),
            sideRight: this.analyzeSideView(AppState.capturedData.sideRightLandmarks, 'right'),
            back: this.analyzeBackView(AppState.capturedData.backLandmarks)
        };

        // Create comprehensive deformity summary
        analysis.deformitySummary = this.generateDeformitySummary(analysis);

        AppState.postureAnalysis = analysis;
        console.log('Posture analysis completed with enhanced knee analysis:', analysis);
    },

    analyzeUploadedPosture() {
        const analysis = {
            front: this.analyzeFrontView(AppState.uploadedData.frontLandmarks),
            sideLeft: this.analyzeSideView(AppState.uploadedData.sideLeftLandmarks, 'left'),
            sideRight: this.analyzeSideView(AppState.uploadedData.sideRightLandmarks, 'right'),
            back: this.analyzeBackView(AppState.uploadedData.backLandmarks)
        };

        // Create comprehensive deformity summary
        analysis.deformitySummary = this.generateDeformitySummary(analysis);

        AppState.postureAnalysis = analysis;
        console.log('Uploaded posture analysis completed with enhanced knee analysis:', analysis);
    },

    generateDeformitySummary(analysis) {
        const summary = {
            frontalPlane: [],
            sagittalPlane: [],
            bilateralComparison: [],
            kneeAnalysis: {
                front: {},
                side: {}
            }
        };

        // Collect frontal plane deformities
        if (analysis.front && analysis.front.deformities) {
            summary.frontalPlane = analysis.front.deformities;
            
            // Extract knee valgus/varus information
            if (analysis.front.measurements) {
                summary.kneeAnalysis.front = {
                    left: {
                        angle: analysis.front.measurements.leftKneeAlignment,
                        direction: analysis.front.measurements.leftKneeDirection
                    },
                    right: {
                        angle: analysis.front.measurements.rightKneeAlignment,
                        direction: analysis.front.measurements.rightKneeDirection
                    }
                };
            }
        }

        // Collect posterior deformities
        if (analysis.back && analysis.back.deformities) {
            summary.frontalPlane.push(...analysis.back.deformities);
        }

        // Collect sagittal plane deformities from both sides
        if (analysis.sideLeft && analysis.sideLeft.deformities) {
            analysis.sideLeft.deformities.forEach(def => {
                summary.sagittalPlane.push({
                    ...def,
                    side: 'LEFT'
                });
            });
        }

        if (analysis.sideRight && analysis.sideRight.deformities) {
            analysis.sideRight.deformities.forEach(def => {
                summary.sagittalPlane.push({
                    ...def,
                    side: 'RIGHT'
                });
            });
        }

        // Extract knee flexion/extension information
        if (analysis.sideLeft && analysis.sideLeft.measurements) {
            summary.kneeAnalysis.side.left = {
                angle: analysis.sideLeft.measurements.leftKneePosition,
                direction: analysis.sideLeft.measurements.leftKneePositionType,
                rightAngle: analysis.sideLeft.measurements.rightKneePosition,
                rightDirection: analysis.sideLeft.measurements.rightKneePositionType
            };
        }

        if (analysis.sideRight && analysis.sideRight.measurements) {
            summary.kneeAnalysis.side.right = {
                angle: analysis.sideRight.measurements.leftKneePosition,
                direction: analysis.sideRight.measurements.leftKneePositionType,
                rightAngle: analysis.sideRight.measurements.rightKneePosition,
                rightDirection: analysis.sideRight.measurements.rightKneePositionType
            };
        }

        // Compare left and right side measurements
        if (analysis.sideLeft && analysis.sideRight) {
            const leftMeas = analysis.sideLeft.measurements;
            const rightMeas = analysis.sideRight.measurements;

            // Compare forward neck
            const neckDiff = Math.abs(parseFloat(leftMeas.forwardNeck) - parseFloat(rightMeas.forwardNeck));
            if (neckDiff > 3) {
                const moreSevere = parseFloat(leftMeas.forwardNeck) > parseFloat(rightMeas.forwardNeck) ? 'LEFT' : 'RIGHT';
                summary.bilateralComparison.push({
                    type: 'Forward Neck Asymmetry',
                    moreSevere: moreSevere,
                    leftValue: leftMeas.forwardNeck + '°',
                    rightValue: rightMeas.forwardNeck + '°',
                    difference: neckDiff.toFixed(1) + '°'
                });
            }

            // Compare thoracic curvature
            const thoracicDiff = Math.abs(parseFloat(leftMeas.thoracicCurvature) - parseFloat(rightMeas.thoracicCurvature));
            if (thoracicDiff > 5) {
                const moreSevere = parseFloat(leftMeas.thoracicCurvature) > parseFloat(rightMeas.thoracicCurvature) ? 'LEFT' : 'RIGHT';
                summary.bilateralComparison.push({
                    type: 'Thoracic Curvature Asymmetry',
                    moreSevere: moreSevere,
                    leftValue: leftMeas.thoracicCurvature + '°',
                    rightValue: rightMeas.thoracicCurvature + '°',
                    difference: thoracicDiff.toFixed(1) + '°'
                });
            }

            // Compare lumbar curvature
            const lumbarDiff = Math.abs(parseFloat(leftMeas.lumbarCurvature) - parseFloat(rightMeas.lumbarCurvature));
            if (lumbarDiff > 5) {
                const moreSevere = parseFloat(leftMeas.lumbarCurvature) > parseFloat(rightMeas.lumbarCurvature) ? 'LEFT' : 'RIGHT';
                summary.bilateralComparison.push({
                    type: 'Lumbar Curvature Asymmetry',
                    moreSevere: moreSevere,
                    leftValue: leftMeas.lumbarCurvature + '°',
                    rightValue: rightMeas.lumbarCurvature + '°',
                    difference: lumbarDiff.toFixed(1) + '°'
                });
            }

            // Compare knee positions (flexion/extension)
            const leftKneeDiff = Math.abs(parseFloat(leftMeas.leftKneePosition) - parseFloat(rightMeas.leftKneePosition));
            const rightKneeDiff = Math.abs(parseFloat(leftMeas.rightKneePosition) - parseFloat(rightMeas.rightKneePosition));
            
            if (leftKneeDiff > 3) {
                summary.bilateralComparison.push({
                    type: 'Left Knee Side-to-Side Variation',
                    moreSevere: parseFloat(leftMeas.leftKneePosition) > parseFloat(rightMeas.leftKneePosition) ? 'LEFT VIEW' : 'RIGHT VIEW',
                    leftValue: `${leftMeas.leftKneePosition}° ${leftMeas.leftKneePositionType}`,
                    rightValue: `${rightMeas.leftKneePosition}° ${rightMeas.leftKneePositionType}`,
                    difference: leftKneeDiff.toFixed(1) + '°'
                });
            }

            if (rightKneeDiff > 3) {
                summary.bilateralComparison.push({
                    type: 'Right Knee Side-to-Side Variation',
                    moreSevere: parseFloat(leftMeas.rightKneePosition) > parseFloat(rightMeas.rightKneePosition) ? 'LEFT VIEW' : 'RIGHT VIEW',
                    leftValue: `${leftMeas.rightKneePosition}° ${leftMeas.rightKneePositionType}`,
                    rightValue: `${rightMeas.rightKneePosition}° ${rightMeas.rightKneePositionType}`,
                    difference: rightKneeDiff.toFixed(1) + '°'
                });
            }
        }

        return summary;
    },

    generateExerciseProtocol(analysis) {
        const exercises = [];
        const schedule = [];

        if (analysis.front?.issues.some(issue => !issue.includes('✓')) ||
            analysis.sideLeft?.issues.some(issue => !issue.includes('✓')) ||
            analysis.sideRight?.issues.some(issue => !issue.includes('✓')) ||
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

console.log('Clinical Analysis Engine loaded with Enhanced Knee Valgus/Varus and Flexion/Extension Detection');