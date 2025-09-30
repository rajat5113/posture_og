// pdf-generator.js - Enhanced PDF Generator with Comprehensive Clinical Measurements

const PDFGenerator = {
    currentDataSource: null,

    init() {
        this.initializeModalEventListeners();
        console.log('Enhanced PDF Generator initialized with comprehensive clinical measurements');
    },

    async generateAISummary(analysisData) {
        console.log('Generating AI summary with ChatGPT-4 Mini...');
        try {
            const response = await fetch('/api/generate-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysisData: analysisData })
            });
            if (!response.ok) throw new Error(`API call failed: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return {
                summary: data.summary || "Unable to generate summary.",
                exercises: data.exercises || "Unable to generate exercise recommendations."
            };
        } catch (error) {
            console.error("API call failed:", error);
            return {
                summary: `Error: ${error.message}`,
                exercises: "Unable to generate recommendations."
            };
        }
    },

    initializeModalEventListeners() {
        const pdfPreviewModal = document.getElementById('pdfPreviewModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const downloadFinalBtn = document.getElementById('downloadFinalBtn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const saveChangesBtn = document.getElementById('saveChangesBtn');

        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.hideModal());
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => this.hideModal());
        if (saveChangesBtn) saveChangesBtn.addEventListener('click', () => this.handleSaveChanges());
        if (downloadFinalBtn) {
            downloadFinalBtn.addEventListener('click', () => {
                this.generateFinalPDF();
                this.hideModal();
            });
        }
    },

    async showPDFEditModal(dataSource) {
        const pdfPreviewModal = document.getElementById('pdfPreviewModal');
        if (!pdfPreviewModal) return;
        
        this.currentDataSource = dataSource;
        pdfPreviewModal.classList.remove('hidden');
        
        document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('patientName').value = 'Patient Name';
        document.getElementById('clinicianName').value = 'Clinician Name';

        this.setTextareaValue('clinicalSummary', 'Generating comprehensive AI clinical summary...');
        this.setTextareaValue('exerciseProtocol', 'Generating personalized AI exercise recommendations...');
        
        const aiContent = await this.generateAISummary(AppState.postureAnalysis);
        this.setTextareaValue('clinicalSummary', aiContent.summary);
        this.setTextareaValue('exerciseProtocol', aiContent.exercises);
        
        this.generateSimplePreview();
        document.getElementById('downloadFinalBtn').disabled = false;
    },
    
    generateSimplePreview() {
        const reportPreview = document.getElementById('reportPreview');
        if (!reportPreview) return;
        const patientName = this.getInputValue('patientName', 'Patient');
        reportPreview.innerHTML = `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
                <h3>Comprehensive Clinical Report Preview for ${patientName}</h3>
                <p><strong>The final PDF will include:</strong></p>
                <ul style="margin-left: 20px;">
                    <li>Detailed anatomical avatars with visual annotations</li>
                    <li>All clinical measurements in both degrees and centimeters</li>
                    <li>Comprehensive data table with normal ranges</li>
                    <li>AI-generated clinical assessment summary</li>
                    <li>Personalized exercise protocol recommendations</li>
                </ul>
                <h4 style="color: #667eea; margin-top: 15px;">AI Clinical Summary Preview:</h4>
                <p style="font-size: 12px;">${this.getInputValue('clinicalSummary').substring(0, 250)}...</p>
                <h4 style="color: #28a745; margin-top: 15px;">AI Exercise Protocol Preview:</h4>
                <p style="font-size: 12px;">${this.getInputValue('exerciseProtocol').substring(0, 250)}...</p>
            </div>
        `;
    },

    setTextareaValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value;
    },

    hideModal() {
        document.getElementById('pdfPreviewModal')?.classList.add('hidden');
    },

    handleSaveChanges() {
        const saveBtn = document.getElementById('saveChangesBtn');
        if (saveBtn) {
            saveBtn.textContent = 'Saved!';
            saveBtn.style.background = '#28a745';
            setTimeout(() => {
                saveBtn.textContent = 'Save Changes';
                saveBtn.style.background = '';
            }, 2000);
        }
    },

    getInputValue(id, defaultValue = '') {
        const element = document.getElementById(id);
        return element ? (element.value || '').trim() || defaultValue : defaultValue;
    },

    drawAvatar(doc, x, y, view) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(1);

        // Head
        doc.circle(x, y + 10, 10, 'D');
        // Neck
        doc.line(x, y + 20, x, y + 25);
        // Spine
        doc.line(x, y + 25, x, y + 55);
        // Arms
        doc.line(x - 15, y + 30, x + 15, y + 30);
        // Pelvis line
        doc.line(x - 12, y + 55, x + 12, y + 55);

        if (view === 'front' || view === 'back') {
            // Arms extended
            doc.line(x - 15, y + 30, x - 18, y + 50);
            doc.line(x + 15, y + 30, x + 18, y + 50);
            // Legs
            doc.line(x - 12, y + 55, x - 10, y + 80);
            doc.line(x + 12, y + 55, x + 10, y + 80);
            // Lower legs
            doc.line(x - 10, y + 80, x - 12, y + 105);
            doc.line(x + 10, y + 80, x + 12, y + 105);
        }

        if (view === 'side') {
            doc.setLineDashPattern([2, 2], 0);
            doc.line(x, y + 20, x, y + 105);
            doc.setLineDashPattern([], 0);
            
            // Shoulder forward
            doc.line(x + 15, y + 30, x + 5, y + 35);
            // Hip
            doc.line(x + 12, y + 55, x, y + 55);
            // Thigh
            doc.line(x, y + 55, x - 2, y + 80);
            // Lower leg
            doc.line(x - 2, y + 80, x, y + 105);
        }
    },

    drawPostureAvatarsWithAnnotations(doc, yPos) {
        if (!AppState.postureAnalysis) return yPos;

        const analysis = AppState.postureAnalysis;
        const views = { front: 55, side: 105, back: 155 };

        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text('Postural Analysis Visual Summary', 105, yPos, { align: 'center' });
        yPos += 8;

        Object.entries(views).forEach(([view, x]) => {
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(view.charAt(0).toUpperCase() + view.slice(1) + " View", x, yPos, { align: 'center' });
            this.drawAvatar(doc, x, yPos + 5, view);
        });

        const avatarTop = yPos + 5;
        doc.setLineWidth(0.5);
        doc.setTextColor(220, 53, 69);
        doc.setFontSize(6.5);

        // FRONT VIEW ANNOTATIONS
        const frontAnalysis = analysis.front;
        if (frontAnalysis && frontAnalysis.measurements) {
            const x = views.front;
            
            // Ear Pinnae Level
            if (frontAnalysis.measurements.earPinnaeLevelCm && parseFloat(frontAnalysis.measurements.earPinnaeLevelCm) > 1) {
                doc.line(x - 10, avatarTop + 8, x + 10, avatarTop + 12);
                doc.text(`Ear: ${frontAnalysis.measurements.earPinnaeLevelCm}cm`, x - 18, avatarTop + 8);
            }

            // Neck Level
            if (frontAnalysis.measurements.neckLevelCm && parseFloat(frontAnalysis.measurements.neckLevelCm) > 1.5) {
                const direction = frontAnalysis.issues.some(i => i.includes('left')) ? -1 : 1;
                doc.line(x, avatarTop + 22, x + (direction * 5), avatarTop + 18);
                doc.text(`Neck: ${frontAnalysis.measurements.neckLevelCm}cm`, x + (direction * 6), avatarTop + 20);
            }

            // Shoulder Level
            if (frontAnalysis.measurements.shoulderLevelCm && parseFloat(frontAnalysis.measurements.shoulderLevelCm) > 1.5) {
                doc.line(x - 15, avatarTop + 30, x + 15, avatarTop + 30);
                doc.text(`Shoulder: ${frontAnalysis.measurements.shoulderLevelCm}cm`, x + 17, avatarTop + 30);
            }

            // Elbow Level
            if (frontAnalysis.measurements.elbowLevelCm && parseFloat(frontAnalysis.measurements.elbowLevelCm) > 2) {
                doc.text(`Elbow: ${frontAnalysis.measurements.elbowLevelCm}cm`, x + 20, avatarTop + 50);
            }

            // Pelvic Obliquity
            if (frontAnalysis.measurements.pelvicObliquityCm && parseFloat(frontAnalysis.measurements.pelvicObliquityCm) > 1.5) {
                doc.line(x - 12, avatarTop + 55, x + 12, avatarTop + 55);
                doc.text(`Pelvis: ${frontAnalysis.measurements.pelvicObliquityCm}cm`, x + 14, avatarTop + 55);
            }

            // Knee Level
            if (frontAnalysis.measurements.kneeLevelCm && parseFloat(frontAnalysis.measurements.kneeLevelCm) > 1.5) {
                doc.text(`Knee: ${frontAnalysis.measurements.kneeLevelCm}cm`, x + 14, avatarTop + 80);
            }
        }
        
        // SIDE VIEW ANNOTATIONS
        const sideAnalysis = analysis.side;
        if (sideAnalysis && sideAnalysis.measurements) {
            const x = views.side;
            
            // Forward Neck/Chin
            if (sideAnalysis.measurements.forwardNeckCm && parseFloat(sideAnalysis.measurements.forwardNeckCm) > 4) {
                doc.line(x, avatarTop + 25, x - 8, avatarTop + 15);
                doc.text(`Neck: ${sideAnalysis.measurements.forwardNeckCm}cm`, x - 18, avatarTop + 18);
            }

            // Shoulder Position
            if (sideAnalysis.measurements.shoulderPosition && parseFloat(sideAnalysis.measurements.shoulderPosition) > 10) {
                const type = sideAnalysis.measurements.shoulderPostureType || '';
                doc.text(`${type.substring(0, 8)}: ${sideAnalysis.measurements.shoulderPosition}°`, x - 20, avatarTop + 35);
            }

            // Thoracic Curvature
            if (sideAnalysis.measurements.thoracicCurvature) {
                const angle = parseFloat(sideAnalysis.measurements.thoracicCurvature);
                if (angle > 40 || angle < 20) {
                    doc.path('M ' + (x) + ' ' + (avatarTop + 30) + ' Q ' + (x-8) + ' ' + (avatarTop + 42) + ' ' + (x) + ' ' + (avatarTop + 55)).stroke();
                    doc.text(`T-spine: ${angle.toFixed(0)}°`, x - 18, avatarTop + 45);
                }
            }

            // Lumbar Curvature
            if (sideAnalysis.measurements.lumbarCurvature) {
                const angle = parseFloat(sideAnalysis.measurements.lumbarCurvature);
                if (angle > 60 || angle < 40) {
                    doc.text(`L-spine: ${angle.toFixed(0)}°`, x - 18, avatarTop + 60);
                }
            }

            // Knee Position
            if (sideAnalysis.measurements.kneePosition && parseFloat(sideAnalysis.measurements.kneePosition) > 5) {
                const type = sideAnalysis.measurements.kneePositionType || '';
                doc.text(`Knee ${type}: ${sideAnalysis.measurements.kneePosition}°`, x - 18, avatarTop + 85);
            }
        }

        // BACK VIEW ANNOTATIONS
        const backAnalysis = analysis.back;
        if (backAnalysis && backAnalysis.measurements) {
            const x = views.back;
            
            // Elbow Level
            if (backAnalysis.measurements.elbowLevelCm && parseFloat(backAnalysis.measurements.elbowLevelCm) > 2) {
                doc.text(`Elbow: ${backAnalysis.measurements.elbowLevelCm}cm`, x + 20, avatarTop + 50);
            }

            // Scapular Level
            if (backAnalysis.measurements.scapularLevelCm && parseFloat(backAnalysis.measurements.scapularLevelCm) > 1.5) {
                doc.line(x - 15, avatarTop + 30, x + 15, avatarTop + 30);
                doc.text(`Scapula: ${backAnalysis.measurements.scapularLevelCm}cm`, x + 17, avatarTop + 30);
            }

            // PSIS Level
            if (backAnalysis.measurements.psisLevelCm && parseFloat(backAnalysis.measurements.psisLevelCm) > 1.5) {
                doc.text(`PSIS: ${backAnalysis.measurements.psisLevelCm}cm`, x + 14, avatarTop + 55);
            }

            // Gluteal Fold
            if (backAnalysis.measurements.glutealFoldAsymmetry && parseFloat(backAnalysis.measurements.glutealFoldAsymmetry) > 3) {
                doc.text(`Gluteal: ${backAnalysis.measurements.glutealFoldAsymmetry}%`, x + 14, avatarTop + 68);
            }

            // Popliteal Line
            if (backAnalysis.measurements.poplitealLineCm && parseFloat(backAnalysis.measurements.poplitealLineCm) > 1.5) {
                doc.text(`Popliteal: ${backAnalysis.measurements.poplitealLineCm}cm`, x + 14, avatarTop + 80);
            }
        }

        return yPos + 125;
    },

    drawAnalysisDataTable(doc, yPos) {
        if (!AppState.postureAnalysis) return yPos;

        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text('Comprehensive Clinical Measurement Data', 15, yPos);
        yPos += 8;

        const tableHeaders = ["View", "Measurement", "Value (°)", "Value (cm)", "Normal Range", "Status"];
        const colWidths = [16, 42, 18, 18, 38, 28];
        const rowHeight = 6;
        let xPos = 15;

        // Table header
        doc.setFillColor(230, 230, 230);
        doc.rect(15, yPos, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        tableHeaders.forEach((header, i) => {
            doc.text(header, xPos + 1.5, yPos + 4.5);
            xPos += colWidths[i];
        });
        yPos += rowHeight;

        const allMeasurements = [
            // Front View
            { view: 'Front', key: 'earPinnaeLevel', cmKey: 'earPinnaeLevelCm', name: 'Ear Pinnae Level', normal: '<3° / <1cm' },
            { view: 'Front', key: 'neckLevel', cmKey: 'neckLevelCm', name: 'Neck Level (Lateral Dev)', normal: '<5° / <1.5cm' },
            { view: 'Front', key: 'shoulderLevel', cmKey: 'shoulderLevelCm', name: 'Shoulder Level', normal: '<2° / <1.5cm' },
            { view: 'Front', key: 'elbowLevel', cmKey: 'elbowLevelCm', name: 'Elbow Level', normal: '<3° / <2cm' },
            { view: 'Front', key: 'pelvicObliquity', cmKey: 'pelvicObliquityCm', name: 'Pelvic Obliquity', normal: '<2° / <1.5cm' },
            { view: 'Front', key: 'kneeLevel', cmKey: 'kneeLevelCm', name: 'Knee Level', normal: '<2° / <1.5cm' },
            { view: 'Front', key: 'leftKneeAlignment', name: 'Left Knee Alignment', normal: '<8° from straight' },
            { view: 'Front', key: 'rightKneeAlignment', name: 'Right Knee Alignment', normal: '<8° from straight' },
            
            // Side View
            { view: 'Side', key: 'forwardNeck', cmKey: 'forwardNeckCm', name: 'Forward Neck Posture', normal: '<15° / <4cm' },
            { view: 'Side', key: 'chinForward', cmKey: 'chinForwardCm', name: 'Chin Forward', normal: '<12° / <3cm' },
            { view: 'Side', key: 'shoulderPosition', name: 'Shoulder Position', normal: '<10° from vertical' },
            { view: 'Side', key: 'thoracicCurvature', name: 'Thoracic Curvature', normal: '20-40°' },
            { view: 'Side', key: 'lumbarCurvature', name: 'Lumbar Curvature', normal: '40-60°' },
            { view: 'Side', key: 'kneePosition', name: 'Knee Position', normal: '<5° from straight' },
            
            // Back View
            { view: 'Back', key: 'elbowLevel', cmKey: 'elbowLevelCm', name: 'Elbow Level (Back)', normal: '<3° / <2cm' },
            { view: 'Back', key: 'scapularLevel', cmKey: 'scapularLevelCm', name: 'Scapular Level', normal: '<2° / <1.5cm' },
            { view: 'Back', key: 'psisLevel', cmKey: 'psisLevelCm', name: 'PSIS Level', normal: '<2° / <1.5cm' },
            { view: 'Back', key: 'glutealFoldAsymmetry', name: 'Gluteal Fold Asymmetry', normal: '<3%' },
            { view: 'Back', key: 'poplitealLine', cmKey: 'poplitealLineCm', name: 'Popliteal Line', normal: '<2° / <1.5cm' },
        ];
        
        const analysisData = AppState.postureAnalysis;

        allMeasurements.forEach(metric => {
            const viewData = analysisData[metric.view.toLowerCase()];
            if (viewData && viewData.measurements && viewData.measurements[metric.key] !== undefined) {
                let angleValue = parseFloat(viewData.measurements[metric.key]);

                let cmValue = '-';
                if (metric.cmKey && viewData.measurements[metric.cmKey]) {
                    cmValue = parseFloat(viewData.measurements[metric.cmKey]).toFixed(1);
                } else if (metric.name.includes('Gluteal')) {
                    cmValue = angleValue.toFixed(1) + '%';
                }

                // Fixed: Proper abnormal detection based on thresholds from 0°
                let issueFound = false;
                const actualAngle = parseFloat(viewData.measurements[metric.key]);
                const actualCm = metric.cmKey ? parseFloat(viewData.measurements[metric.cmKey]) : 0;

                // All measurements now use 0° reference - check if they exceed thresholds
                if (metric.name.includes('Ear Pinnae')) {
                    issueFound = actualAngle > 3 || actualCm > 1;
                } else if (metric.name.includes('Neck Level')) {
                    issueFound = actualAngle > 5 || actualCm > 1.5;
                } else if (metric.name.includes('Shoulder Level')) {
                    issueFound = actualAngle > 2 || actualCm > 1.5;
                } else if (metric.name.includes('Elbow Level')) {
                    issueFound = actualAngle > 3 || actualCm > 2;
                } else if (metric.name.includes('Pelvic Obliquity')) {
                    issueFound = actualAngle > 2 || actualCm > 1.5;
                } else if (metric.name.includes('Knee Level')) {
                    issueFound = actualAngle > 2 || actualCm > 1.5;
                } else if (metric.name.includes('Knee Alignment')) {
                    issueFound = actualAngle > 8;
                } else if (metric.name.includes('Forward Neck')) {
                    issueFound = actualAngle > 15 || actualCm > 4;
                } else if (metric.name.includes('Chin Forward')) {
                    issueFound = actualAngle > 12 || actualCm > 3;
                } else if (metric.name.includes('Shoulder Position')) {
                    issueFound = actualAngle > 10;
                } else if (metric.name.includes('Thoracic Curvature')) {
                    issueFound = actualAngle > 40 || actualAngle < 20;
                } else if (metric.name.includes('Lumbar Curvature')) {
                    issueFound = actualAngle > 60 || actualAngle < 40;
                } else if (metric.name.includes('Knee Position')) {
                    issueFound = actualAngle > 5;
                } else if (metric.name.includes('Scapular Level')) {
                    issueFound = actualAngle > 2 || actualCm > 1.5;
                } else if (metric.name.includes('PSIS Level')) {
                    issueFound = actualAngle > 2 || actualCm > 1.5;
                } else if (metric.name.includes('Gluteal')) {
                    issueFound = actualAngle > 3;
                } else if (metric.name.includes('Popliteal')) {
                    issueFound = actualAngle > 2 || actualCm > 1.5;
                }

                const status = issueFound ? 'Abnormal' : 'Normal';

                xPos = 15;
                doc.setDrawColor(200, 200, 200);
                doc.line(15, yPos, 175, yPos);

                if(status === 'Abnormal') {
                    doc.setTextColor(220, 53, 69);
                } else {
                    doc.setTextColor(0, 0, 0);
                }

                const rowData = [
                    metric.view,
                    metric.name,
                    angleValue === '-' ? '-' : angleValue.toFixed(1),
                    cmValue,
                    metric.normal,
                    status
                ];
                
                doc.setFontSize(7);
                rowData.forEach((cell, i) => {
                    doc.text(String(cell), xPos + 1.5, yPos + 4.5);
                    xPos += colWidths[i];
                });
                yPos += rowHeight;
            }
        });
        doc.line(15, yPos, 175, yPos);

        return yPos + 5;
    },

    addStyledSectionToPDF(doc, title, content, yPos, color) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFillColor(...color);
        doc.rect(15, yPos, 180, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text(title, 20, yPos + 5.5);
        
        yPos += 12;
        
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(content, 175);
        
        lines.forEach(line => {
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(line, 20, yPos);
            yPos += 5;
        });
        
        return yPos + 10;
    },
    
    generateFinalPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Header
            doc.setFillColor(102, 126, 234);
            doc.rect(0, 0, 210, 35, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.text('Comprehensive Clinical Postural Assessment', 105, 15, { align: 'center' });
            
            const patientName = this.getInputValue('patientName', 'Patient');
            const patientAge = this.getInputValue('patientAge', 'N/A');
            const assessmentDate = this.getInputValue('assessmentDate') ? new Date(this.getInputValue('assessmentDate')).toLocaleDateString() : new Date().toLocaleDateString();
            const clinicianName = this.getInputValue('clinicianName', 'Clinician');
            
            doc.setFontSize(10);
            doc.text(`Patient: ${patientName} | Age: ${patientAge}`, 105, 23, { align: 'center' });
            doc.text(`Assessment Date: ${assessmentDate} | Assessed by: ${clinicianName}`, 105, 29, { align: 'center' });

            let yPos = 45;

            // Visual Avatars
            yPos = this.drawPostureAvatarsWithAnnotations(doc, yPos);

            // Comprehensive Data Table
            yPos = this.drawAnalysisDataTable(doc, yPos);

            // AI Sections
            if (yPos > 180) {
                doc.addPage();
                yPos = 20;
            }
            
            const clinicalSummary = this.getInputValue('clinicalSummary');
            yPos = this.addStyledSectionToPDF(doc, 'CLINICAL ASSESSMENT SUMMARY', clinicalSummary, yPos, [102, 126, 234]);
            
            const exerciseProtocol = this.getInputValue('exerciseProtocol');
            yPos = this.addStyledSectionToPDF(doc, 'PERSONALIZED EXERCISE PROTOCOL', exerciseProtocol, yPos, [40, 167, 69]);

            const filename = `comprehensive-posture-report-${patientName.replace(/\s/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            console.log('Comprehensive clinical PDF generated:', filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please check the console for details.');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PDFGenerator.init();
});