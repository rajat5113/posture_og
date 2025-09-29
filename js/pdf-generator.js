// enhanced-pdf-generator.js - Enhanced PDF with Body Diagram Avatars and Data Table

const PDFGenerator = {
    currentDataSource: null,

    init() {
        this.initializeModalEventListeners();
        console.log('Enhanced PDF Generator initialized');
    },

    // Generate AI Summary
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

        this.setTextareaValue('clinicalSummary', 'Generating AI summary...');
        this.setTextareaValue('exerciseProtocol', 'Generating AI recommendations...');
        
        const aiContent = await this.generateAISummary(AppState.postureAnalysis);
        this.setTextareaValue('clinicalSummary', aiContent.summary);
        this.setTextareaValue('exerciseProtocol', aiContent.exercises);
        
        // This preview is now simplified as the final PDF is much more complex
        this.generateSimplePreview();
        document.getElementById('downloadFinalBtn').disabled = false;
    },
    
    generateSimplePreview() {
        const reportPreview = document.getElementById('reportPreview');
        if (!reportPreview) return;
        const patientName = this.getInputValue('patientName', 'Patient');
        reportPreview.innerHTML = `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
                <h3>Report Preview for ${patientName}</h3>
                <p>The final PDF will include detailed avatars and a data table.</p>
                <h4>AI Summary:</h4>
                <p>${this.getInputValue('clinicalSummary').substring(0, 200)}...</p>
                <h4>AI Exercises:</h4>
                <p>${this.getInputValue('exerciseProtocol').substring(0, 200)}...</p>
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

    // ## MODIFICATION START ## - New PDF Generation Logic

    /**
     * Draws a stick-figure avatar for a given view.
     * @param {jsPDF} doc - The jsPDF document instance.
     * @param {number} x - The center x-coordinate for the avatar.
     * @param {number} y - The top y-coordinate for the avatar.
     * @param {string} view - 'front', 'side', or 'back'.
     */
    drawAvatar(doc, x, y, view) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(1);

        // Head
        doc.circle(x, y + 10, 10, 'D');
        // Torso
        doc.line(x, y + 20, x, y + 55);
        // Shoulders
        doc.line(x - 15, y + 25, x + 15, y + 25);
        // Hips/Pelvis
        doc.line(x - 12, y + 55, x + 12, y + 55);

        if (view === 'front' || view === 'back') {
            // Arms
            doc.line(x - 15, y + 25, x - 18, y + 45); // Left arm
            doc.line(x + 15, y + 25, x + 18, y + 45); // Right arm
            // Legs
            doc.line(x - 12, y + 55, x - 8, y + 80); // Left leg
            doc.line(x + 12, y + 55, x + 8, y + 80); // Right leg
            doc.line(x - 8, y + 80, x - 10, y + 105); // Left calf
            doc.line(x + 8, y + 80, x + 10, y + 105); // Right calf
        }

        if (view === 'side') {
            doc.setLineDashPattern([2, 2], 0);
            doc.line(x, y + 20, x, y + 105); // Vertical reference line
            doc.setLineDashPattern([], 0);
            
            // Side profile
            doc.line(x + 15, y + 25, x, y + 30); // Shoulder to spine
            doc.line(x + 12, y + 55, x, y + 55); // Hip to spine
            doc.line(x, y + 55, x - 2, y + 80); // Leg
            doc.line(x - 2, y + 80, x, y + 105); // Calf
        }
    },

    /**
     * Draws the avatars with annotations for identified issues.
     * @param {jsPDF} doc - The jsPDF document instance.
     * @param {number} yPos - The starting y-position.
     * @returns {number} The new y-position after drawing.
     */
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
        doc.setTextColor(220, 53, 69); // Red for annotations
        doc.setFontSize(7);

        // --- Front View Annotations ---
        const frontAnalysis = analysis.front;
        if (frontAnalysis && frontAnalysis.issues.length > 0) {
            const x = views.front;
            frontAnalysis.issues.forEach(issue => {
                if (issue.includes('Cervical lateral deviation')) {
                    const angle = parseFloat(frontAnalysis.measurements.neckDeviation);
                    const direction = issue.includes('left') ? -1 : 1;
                    doc.line(x, avatarTop + 20, x + (direction * 5), avatarTop + 10);
                    doc.text(`${angle.toFixed(1)}°`, x + (direction * 6), avatarTop + 15);
                }
                if (issue.includes('Shoulder height asymmetry')) {
                    const angle = parseFloat(frontAnalysis.measurements.shoulderHeightDiff);
                    const direction = issue.includes('left side elevated') ? -1 : 1;
                    doc.line(x - 15, avatarTop + 25 + (direction * 1), x + 15, avatarTop + 25 - (direction * 1));
                    doc.text(`${(180 - angle).toFixed(1)}°`, x + 17, avatarTop + 25);
                }
                if (issue.includes('Pelvic obliquity')) {
                    const angle = parseFloat(frontAnalysis.measurements.hipHeightDiff);
                     const direction = issue.includes('left side elevated') ? -1 : 1;
                    doc.line(x - 12, avatarTop + 55 + (direction * 1), x + 12, avatarTop + 55 - (direction * 1));
                    doc.text(`${(180 - angle).toFixed(1)}°`, x + 14, avatarTop + 55);
                }
            });
        }
        
        // --- Side View Annotations ---
        const sideAnalysis = analysis.side;
        if (sideAnalysis && sideAnalysis.issues.length > 0) {
            const x = views.side;
            sideAnalysis.issues.forEach(issue => {
                if (issue.includes('Forward neck posture')) {
                    const angle = parseFloat(sideAnalysis.measurements.neckForward);
                    doc.line(x, avatarTop + 25, x, avatarTop + 10); // Vertical ref
                    doc.line(x, avatarTop + 25, x - 5, avatarTop + 10); // Head line
                    doc.text(`${angle.toFixed(1)}°`, x - 12, avatarTop + 18);
                }
                if (issue.includes('Excessive back bend')) {
                     const angle = parseFloat(sideAnalysis.measurements.backBend);
                     doc.path('M ' + (x) + ' ' + (avatarTop + 25) + ' Q ' + (x-10) + ' ' + (avatarTop + 40) + ' ' + (x) + ' ' + (avatarTop + 55)).stroke();
                     doc.text(`${angle.toFixed(1)}°`, x - 12, avatarTop + 40);
                }
                 if (issue.includes('Knee flexion')) {
                    const angle = parseFloat(sideAnalysis.measurements.kneeBend);
                    doc.line(x, avatarTop + 55, x - 2, avatarTop + 80);
                    doc.line(x - 2, avatarTop + 80, x + 2, avatarTop + 105);
                    doc.text(`${angle.toFixed(1)}°`, x + 3, avatarTop + 80);
                }
            });
        }

        // --- Back View Annotations (similar to front) ---
        const backAnalysis = analysis.back;
        if (backAnalysis && backAnalysis.issues.length > 0) {
            const x = views.back;
            backAnalysis.issues.forEach(issue => {
                if (issue.includes('Shoulder height asymmetry')) {
                    const angle = parseFloat(backAnalysis.measurements.shoulderHeightDiff);
                    const direction = issue.includes('left side elevated') ? -1 : 1;
                    doc.line(x - 15, avatarTop + 25 + (direction * 1), x + 15, avatarTop + 25 - (direction * 1));
                    doc.text(`${(180 - angle).toFixed(1)}°`, x + 17, avatarTop + 25);
                }
            });
        }

        return yPos + 125;
    },

    /**
     * Draws the detailed analysis data in a table format.
     * @param {jsPDF} doc - The jsPDF document instance.
     * @param {number} yPos - The starting y-position.
     * @returns {number} The new y-position after drawing.
     */
    drawAnalysisDataTable(doc, yPos) {
        if (!AppState.postureAnalysis) return yPos;

        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text('Clinical Measurement Data', 15, yPos);
        yPos += 8;

        const tableHeaders = ["View", "Measurement", "Value (°)", "Normal Range (°)", "Finding"];
        const colWidths = [20, 55, 25, 40, 40];
        const rowHeight = 7;
        let xPos = 15;

        // Draw table header
        doc.setFillColor(230, 230, 230);
        doc.rect(15, yPos, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        tableHeaders.forEach((header, i) => {
            doc.text(header, xPos + 2, yPos + 5);
            xPos += colWidths[i];
        });
        yPos += rowHeight;

        const allMeasurements = [
            { view: 'Front', key: 'neckDeviation', name: 'Neck Lateral Deviation', normal: '< 5' },
            { view: 'Front', key: 'shoulderHeightDiff', name: 'Shoulder Height Asymmetry', normal: '> 178', isAngle: true },
            { view: 'Front', key: 'hipHeightDiff', name: 'Pelvic Obliquity', normal: '> 178', isAngle: true },
            { view: 'Front', key: 'leftKneeAngle', name: 'Left Knee Alignment (Varus/Valgus)', normal: '< 8' },
            { view: 'Front', key: 'rightKneeAngle', name: 'Right Knee Alignment (Varus/Valgus)', normal: '< 8' },
            { view: 'Side', key: 'neckForward', name: 'Forward Neck Posture', normal: '< 15' },
            { view: 'Side', key: 'backBend', name: 'Thoracic/Lumbar Curvature', normal: '< 20' },
            { view: 'Side', key: 'kneeBend', name: 'Knee Flexion in Standing', normal: '< 10' },
            { view: 'Back', key: 'shoulderHeightDiff', name: 'Scapular Height Asymmetry', normal: '> 178', isAngle: true },
        ];
        
        const analysisData = AppState.postureAnalysis;

        allMeasurements.forEach(metric => {
            const viewData = analysisData[metric.view.toLowerCase()];
            if (viewData && viewData.measurements && viewData.measurements[metric.key] !== undefined) {
                let value = parseFloat(viewData.measurements[metric.key]);
                if (metric.isAngle) {
                    value = 180 - value;
                }

                const issueFound = viewData.issues.some(issue => issue.toLowerCase().includes(metric.name.split(' ')[0].toLowerCase()));
                const finding = issueFound ? 'Abnormal' : 'Normal';

                xPos = 15;
                doc.setDrawColor(200, 200, 200);
                doc.line(15, yPos, 195, yPos); // Horizontal line

                if(finding === 'Abnormal') {
                     doc.setTextColor(220, 53, 69);
                } else {
                     doc.setTextColor(0, 0, 0);
                }

                const rowData = [
                    metric.view,
                    metric.name,
                    value.toFixed(1),
                    metric.normal,
                    finding
                ];
                
                rowData.forEach((cell, i) => {
                    doc.text(String(cell), xPos + 2, yPos + 5);
                    xPos += colWidths[i];
                });
                yPos += rowHeight;
            }
        });
        doc.line(15, yPos, 195, yPos); // Final horizontal line

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
            
            // --- Header ---
            doc.setFillColor(102, 126, 234);
            doc.rect(0, 0, 210, 35, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.text('Clinical Postural Assessment Report', 105, 15, { align: 'center' });
            
            const patientName = this.getInputValue('patientName', 'Patient');
            const patientAge = this.getInputValue('patientAge', 'N/A');
            const assessmentDate = this.getInputValue('assessmentDate') ? new Date(this.getInputValue('assessmentDate')).toLocaleDateString() : new Date().toLocaleDateString();
            const clinicianName = this.getInputValue('clinicianName', 'Clinician');
            
            doc.setFontSize(10);
            doc.text(`Patient: ${patientName} | Age: ${patientAge}`, 105, 23, { align: 'center' });
            doc.text(`Assessment Date: ${assessmentDate} | Assessed by: ${clinicianName}`, 105, 29, { align: 'center' });

            let yPos = 45;

            // --- Draw Avatars with Annotations ---
            yPos = this.drawPostureAvatarsWithAnnotations(doc, yPos);

            // --- Draw Data Table ---
            yPos = this.drawAnalysisDataTable(doc, yPos);

            // --- Add AI Sections ---
            if (yPos > 180) { // Check if we need a new page before summaries
                doc.addPage();
                yPos = 20;
            }
            const clinicalSummary = this.getInputValue('clinicalSummary');
            yPos = this.addStyledSectionToPDF(doc, 'CLINICAL ASSESSMENT SUMMARY', clinicalSummary, yPos, [102, 126, 234]);
            
            const exerciseProtocol = this.getInputValue('exerciseProtocol');
            yPos = this.addStyledSectionToPDF(doc, 'EXERCISE PROTOCOL', exerciseProtocol, yPos, [40, 167, 69]);

            const filename = `posture-report-${patientName.replace(/\s/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            console.log('Final enhanced PDF generated:', filename);
        } catch (error) {
            console.error('Error generating final PDF:', error);
            alert('Error generating PDF. Please check the console for details.');
        }
    }
    // ## MODIFICATION END ##
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    PDFGenerator.init();
});