// analysis-engine.js - Posture Analysis Algorithms and Clinical Measurements

const AnalysisEngine = {
    // Mathematical utility functions
    calculateAngle(a, b, c) {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) angle = 360 - angle;
        return angle;
    },

    calculateDeviationFromVertical(point1, point2) {
        const deltaX = point2.x - point1.x;
        const deltaY = point2.y - point1.y;
        const angleFromVertical = Math.atan2(Math.abs(deltaX), Math.abs(deltaY)) * 180 / Math.PI;
        return angleFromVertical;
    },

    // Analyze front view posture (clinical measurements)
    analyzeFrontView(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            return { issues: [], recommendations: [], measurements: {} };
        }

        const issues = [];
        const recommendations = [];
        const measurements = {};

        // 1. NECK LATERAL DEVIATION (from 0° vertical baseline)
        const nose = landmarks[0];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const shoulderMidpoint = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };

        const neckDeviation = this.calculateDeviationFromVertical(shoulderMidpoint, nose);
        measurements.neckDeviation = neckDeviation.toFixed(1);

        // Clinical threshold: >5° deviation indicates dysfunction
        if (neckDeviation > 5) {
            const side = nose.x < shoulderMidpoint.x ? 'left' : 'right';
            issues.push(`Cervical lateral deviation: ${neckDeviation.toFixed(1)}° to the ${side} (Normal: <5°)`);
            recommendations.push('• Cervical lateral flexion stretching exercises');
            recommendations.push('• Address muscle imbalances in neck and upper trapezius');
        }

        // 2. SHOULDER HEIGHT ASYMMETRY (from 0° horizontal baseline)
        const shoulderSlope = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x) * 180 / Math.PI;
        const shoulderHeightDiff = Math.abs(shoulderSlope);
        measurements.shoulderHeightDiff = shoulderHeightDiff.toFixed(1);

        // Clinical threshold: >2° indicates significant asymmetry
        if (shoulderHeightDiff > 2) {
            const higherSide = shoulderSlope > 0 ? 'left' : 'right';
            const displayAngle = 180-shoulderHeightDiff;
            issues.push(`Shoulder height asymmetry: ${displayAngle.toFixed(1)}° slope, ${higherSide} side elevated (Normal: >178°)`);
            recommendations.push('• Strengthen weaker shoulder stabilizers');
            recommendations.push('• Check for scoliosis or leg length discrepancy');
        }

        // 3. ELBOW HEIGHT DIFFERENCE
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];
        const elbowSlope = Math.atan2(rightElbow.y - leftElbow.y, rightElbow.x - leftElbow.x) * 180 / Math.PI;
        const elbowHeightDiff = Math.abs(elbowSlope);
        measurements.elbowHeightDiff = elbowHeightDiff.toFixed(1);

        // Clinical threshold: >3° indicates asymmetry
        if (elbowHeightDiff > 3) {
            const higherElbow = elbowSlope > 0 ? 'left' : 'right';
            const displayAngle = 180-elbowHeightDiff;
            issues.push(`Elbow height asymmetry: ${displayAngle.toFixed(1)}° difference, ${higherElbow} side elevated (Normal: >177°)`);
            recommendations.push('• Address upper extremity length discrepancies');
            recommendations.push('• Evaluate shoulder girdle alignment');
        }

        // 4. HIP HEIGHT ASYMMETRY
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const hipSlope = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x) * 180 / Math.PI;
        const hipHeightDiff = Math.abs(hipSlope);
        measurements.hipHeightDiff = hipHeightDiff.toFixed(1);

        // Clinical threshold: >2° indicates pelvic dysfunction
        if (hipHeightDiff > 2) {
            const higherHip = hipSlope > 0 ? 'left' : 'right';
            const displayAngle = 180 - hipHeightDiff;
            issues.push(`Pelvic obliquity: ${displayAngle.toFixed(1)}° tilt, ${higherHip} side elevated (Normal: >178°)`);
            recommendations.push('• Assess for leg length discrepancy');
            recommendations.push('• Strengthen hip abductors and core stabilizers');
        }

        // 5. KNEE ALIGNMENT (Q-angle assessment)
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];

        // Calculate knee angles from hip-knee-ankle alignment
        const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);

        // Convert to deviation from neutral (180° = straight leg)
        const leftKneeDeviation = Math.abs(180 - leftKneeAngle);
        const rightKneeDeviation = Math.abs(180 - rightKneeAngle);

        measurements.leftKneeAngle = leftKneeDeviation.toFixed(1);
        measurements.rightKneeAngle = rightKneeDeviation.toFixed(1);

        // Clinical thresholds for valgus/varus
        if (leftKneeDeviation > 8 || rightKneeDeviation > 8) {
            const leftType = leftKneeAngle < 180 ? 'valgus' : 'varus';
            const rightType = rightKneeAngle < 180 ? 'valgus' : 'varus';
            issues.push(`Knee malalignment: Left ${leftKneeDeviation.toFixed(1)}° ${leftType}, Right ${rightKneeDeviation.toFixed(1)}° ${rightType} (Normal: <8°)`);
            recommendations.push('• Hip abductor strengthening exercises');
            recommendations.push('• Address foot pronation/supination patterns');
        }

        // 6. ANKLE ALIGNMENT (Height asymmetry and lateral deviation)
        // Calculate ankle height asymmetry
        const ankleSlope = Math.atan2(rightAnkle.y - leftAnkle.y, rightAnkle.x - leftAnkle.x) * 180 / Math.PI;
        const ankleHeightDiff = Math.abs(ankleSlope);
        measurements.ankleHeightDiff = ankleHeightDiff.toFixed(1);

        // Clinical threshold: >2° indicates ankle dysfunction or compensation
        if (ankleHeightDiff > 2) {
            const higherAnkle = ankleSlope > 0 ? 'left' : 'right';
            const displayAngle = 180 - ankleHeightDiff;
            issues.push(`Ankle height asymmetry: ${displayAngle.toFixed(1)}° difference, ${higherAnkle} side elevated (Normal: >178°)`);
            recommendations.push('• Assess for ankle mobility restrictions');
            recommendations.push('• Check for previous ankle injuries or compensation patterns');
        }

        // Calculate ankle lateral alignment (knee-ankle vertical alignment)
        const leftAnkleDeviation = this.calculateDeviationFromVertical(leftKnee, leftAnkle);
        const rightAnkleDeviation = this.calculateDeviationFromVertical(rightKnee, rightAnkle);

        measurements.leftAnkleAlignment = leftAnkleDeviation.toFixed(1);
        measurements.rightAnkleAlignment = rightAnkleDeviation.toFixed(1);

        // Clinical threshold: >5° indicates ankle alignment issues
        if (leftAnkleDeviation > 5 || rightAnkleDeviation > 5) {
            issues.push(`Ankle alignment deviation: Left ${leftAnkleDeviation.toFixed(1)}°, Right ${rightAnkleDeviation.toFixed(1)}° (Normal: <5°)`);
            recommendations.push('• Ankle strengthening and proprioception exercises');
            recommendations.push('• Address ankle mobility and stability deficits');
        }

        if (issues.length === 0) {
            issues.push('✓ Normal frontal plane alignment');
        }

        return { issues, recommendations, measurements };
    },

    // Analyze side view posture
    analyzeSideView(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            return { issues: [], recommendations: [], measurements: {} };
        }

        const issues = [];
        const recommendations = [];
        const measurements = {};

        // 1. NECK FORWARD POSTURE
        const leftEar = landmarks[7] || landmarks[8];
        const rightEar = landmarks[8] || landmarks[7];
        const nose = landmarks[0];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        const earAvg = leftEar && rightEar ?
            { x: (leftEar.x + rightEar.x) / 2, y: (leftEar.y + rightEar.y) / 2 } :
            leftEar || rightEar || nose;

        const shoulderAvg = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };

        // Calculate neck forward angle
        const neckForward = this.calculateDeviationFromVertical(shoulderAvg, earAvg);
        measurements.neckForward = neckForward.toFixed(1);

        // Clinical threshold: >15° indicates forward head posture
        if (neckForward > 15) {
            issues.push(`Forward neck posture: ${neckForward.toFixed(1)}° forward (Normal: <15°)`);
            recommendations.push('• Neck strengthening exercises');
            recommendations.push('• Improve head and neck alignment');
        }

        // 2. BACK BEND (Thoracic/Lumbar curvature)
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const hipAvg = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };

        // Calculate back curve using shoulder-hip alignment
        const backBend = this.calculateAngle(earAvg, shoulderAvg, hipAvg);
        const backBendDeviation = Math.abs(180 - backBend);
        measurements.backBend = backBendDeviation.toFixed(1);

        // Clinical threshold: >20° indicates excessive back curvature
        if (backBendDeviation > 20) {
            const bendType = backBend < 180 ? 'forward bend' : 'backward bend';
            issues.push(`Excessive back bend: ${backBendDeviation.toFixed(1)}° ${bendType} (Normal: <20°)`);
            recommendations.push('• Back strengthening and stretching exercises');
            recommendations.push('• Improve spinal alignment');
        }

        // 3. KNEE BENT
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];

        const kneeAvg = {
            x: (leftKnee.x + rightKnee.x) / 2,
            y: (leftKnee.y + rightKnee.y) / 2
        };

        const ankleAvg = {
            x: (leftAnkle.x + rightAnkle.x) / 2,
            y: (leftAnkle.y + rightAnkle.y) / 2
        };

        // Calculate knee bend angle
        const kneeBendAngle = this.calculateAngle(hipAvg, kneeAvg, ankleAvg);
        const kneeBend = Math.abs(180 - kneeBendAngle);
        measurements.kneeBend = kneeBend.toFixed(1);

        // Clinical threshold: >10° indicates knee flexion in standing
        if (kneeBend > 10) {
            issues.push(`Knee flexion in standing: ${kneeBend.toFixed(1)}° bend (Normal: <10°)`);
            recommendations.push('• Knee extension strengthening');
            recommendations.push('• Improve standing posture');
        }

        // 4. ANKLE DORSIFLEXION (Side view ankle angle)
        // For side view, we can measure ankle dorsiflexion angle
        // Using knee-ankle alignment as a reference
        const ankleAlignment = this.calculateDeviationFromVertical(kneeAvg, ankleAvg);
        measurements.ankleAlignment = ankleAlignment.toFixed(1);

        // Clinical threshold: >8° indicates ankle positioning issues
        if (ankleAlignment > 8) {
            issues.push(`Ankle positioning deviation: ${ankleAlignment.toFixed(1)}° from vertical (Normal: <8°)`);
            recommendations.push('• Ankle mobility and strengthening exercises');
            recommendations.push('• Calf stretching and dorsiflexion training');
        }

        if (issues.length === 0) {
            issues.push('✓ Normal side view alignment');
        }

        return { issues, recommendations, measurements };
    },

    // Analyze posture from captured camera landmarks
    analyzePosture() {
        const analysis = {
            front: this.analyzeFrontView(AppState.capturedData.frontLandmarks),
            side: this.analyzeSideView(AppState.capturedData.sideLandmarks),
            back: this.analyzeFrontView(AppState.capturedData.backLandmarks) // Use same analysis as front
        };

        AppState.postureAnalysis = analysis;
        console.log('Posture analysis completed:', analysis);
    },

    // Analyze posture from uploaded image landmarks
    analyzeUploadedPosture() {
        const analysis = {
            front: this.analyzeFrontView(AppState.uploadedData.frontLandmarks),
            side: this.analyzeSideView(AppState.uploadedData.sideLandmarks),
            back: this.analyzeFrontView(AppState.uploadedData.backLandmarks)
        };

        AppState.postureAnalysis = analysis;
        console.log('Uploaded posture analysis completed:', analysis);
    },

    // Generate clinical exercise recommendations based on analysis
    generateExerciseProtocol(analysis) {
        const exercises = [];
        const schedule = [];

        // Neck-related exercises
        if (analysis.front.issues.some(issue => issue.includes('Cervical')) ||
            analysis.side.issues.some(issue => issue.includes('Forward neck'))) {
            exercises.push('1. Neck Strengthening Protocol:');
            exercises.push('   Deep neck flexor strengthening (chin tucks): 3 sets x 10 reps');
            exercises.push('   Upper cervical extension: 3 sets x 8 reps');
            exercises.push('   Cervical lateral flexion stretches: Hold 30 seconds each side');
            schedule.push('Neck exercises: Daily, morning and evening');
        }

        // Shoulder-related exercises
        if (analysis.front.issues.some(issue => issue.includes('Shoulder height'))) {
            exercises.push('2. Shoulder Stabilization Protocol:');
            exercises.push('   Scapular wall slides: 3 sets x 12 reps');
            exercises.push('   External rotation with resistance band: 3 sets x 15 reps');
            exercises.push('   Unilateral shoulder blade squeezes: 3 sets x 10 reps each side');
            schedule.push('Shoulder exercises: 5 days per week');
        }

        // Back-related exercises
        if (analysis.side.issues.some(issue => issue.includes('back bend'))) {
            exercises.push('3. Spinal Alignment Protocol:');
            exercises.push('   Thoracic extension mobility: 3 sets x 10 reps');
            exercises.push('   Core strengthening (dead bug): 3 sets x 8 reps each side');
            exercises.push('   Hip flexor stretches: Hold 45 seconds each side');
            schedule.push('Spinal exercises: 4-5 days per week');
        }

        // Hip and knee exercises
        if (analysis.front.issues.some(issue => issue.includes('Hip') || issue.includes('Knee'))) {
            exercises.push('4. Lower Extremity Protocol:');
            exercises.push('   Hip abductor strengthening (clamshells): 3 sets x 12 reps each side');
            exercises.push('   Single leg balance: Hold 30 seconds each leg');
            exercises.push('   Quadriceps strengthening: 3 sets x 10 reps');
            schedule.push('Lower body exercises: 3-4 days per week');
        }

        // Ankle-related exercises
        if (analysis.front.issues.some(issue => issue.includes('Ankle')) ||
            analysis.side.issues.some(issue => issue.includes('Ankle'))) {
            exercises.push('5. Ankle Stability Protocol:');
            exercises.push('   Ankle circles and pumps: 2 sets x 15 reps each direction');
            exercises.push('   Single leg balance on unstable surface: 3 sets x 30 seconds');
            exercises.push('   Calf raises and heel walks: 3 sets x 12 reps');
            exercises.push('   Ankle dorsiflexion stretches: Hold 30 seconds each side');
            schedule.push('Ankle exercises: 4-5 days per week');
        }

        if (exercises.length === 0) {
            exercises.push('Maintenance Protocol:');
            exercises.push(' Continue general posture awareness exercises');
            exercises.push(' Regular movement breaks during prolonged sitting/standing');
            schedule.push('General maintenance: 2-3 times per week');
        }

        return {
            exercises: exercises.join('\n'),
            schedule: schedule.join('\n')
        };
    }
};

console.log('Analysis Engine module loaded');