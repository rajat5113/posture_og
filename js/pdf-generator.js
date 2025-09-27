// pdf-generator.js - PDF Report Generation with ChatGPT-4 Mini Integration

const PDFGenerator = {
    currentDataSource: null,

    init() {
        this.initializeModalEventListeners();
        console.log('PDF Generator module initialized');
    },

    // Real API call to backend that uses ChatGPT-4 Mini
    async generateAISummary(analysisData) {
        console.log('Generating AI summary with ChatGPT-4 Mini...');
        
        try {
            const response = await fetch('/api/generate-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    analysisData: analysisData
                })
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            return {
                summary: data.summary || "Unable to generate summary.",
                exercises: data.exercises || "Unable to generate exercise recommendations."
            };

        } catch (error) {
            console.error("API call failed:", error);
            return {
                summary: `Error generating summary: ${error.message}. Please check your OpenAI API configuration.`,
                exercises: "Unable to generate exercise recommendations due to an error."
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
                this.generateTableFormatPDF();
                this.hideModal();
                if (Elements.statusText) Elements.statusText.innerHTML = '✓ Report downloaded successfully!';
            });
        }
        if (pdfPreviewModal) {
            pdfPreviewModal.addEventListener('click', (e) => {
                if (e.target === pdfPreviewModal) this.hideModal();
            });
        }
    },

    // Function is now async to handle the AI summary generation.
    async showPDFEditModal(dataSource) {
        console.log('Showing PDF edit modal...');
        const pdfPreviewModal = document.getElementById('pdfPreviewModal');
        if (!pdfPreviewModal) {
            console.error('PDF preview modal not found');
            return;
        }
        
        this.currentDataSource = dataSource;

        // Show modal and set default values
        pdfPreviewModal.classList.remove('hidden');
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('assessmentDate').value = today;
        document.getElementById('patientName').value = 'Patient Name';
        document.getElementById('clinicianName').value = 'Clinician Name';

        // Update status and clear old text
        if (Elements.statusText) Elements.statusText.innerHTML = 'Generating AI-powered clinical summary... <div class="loading"></div>';
        this.setTextareaValue('clinicalSummary', 'Generating AI summary...');
        this.setTextareaValue('exerciseProtocol', 'Generating AI exercise recommendations...');
        
        // Generate and populate AI content
        const aiContent = await this.generateAISummary(AppState.postureAnalysis);
        this.setTextareaValue('clinicalSummary', aiContent.summary);
        this.setTextareaValue('exerciseProtocol', aiContent.exercises);
        if (Elements.statusText) Elements.statusText.innerHTML = 'AI summary generated. Please review and edit before downloading.';
        
        // Generate table preview and enable download
        this.generateTablePreview();
        document.getElementById('downloadFinalBtn').disabled = false;
        
        // Add event listeners for real-time preview updates
        this.addRealtimeUpdateListeners();
    },

    setTextareaValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    },

    addRealtimeUpdateListeners() {
        const inputs = [
            'patientName', 'patientAge', 'assessmentDate', 'clinicianName',
            'clinicalSummary', 'exerciseProtocol', 'exerciseSchedule', 
            'additionalNotes', 'treatmentGoals', 'followUpNotes'
        ];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => this.generateTablePreview());
            }
        });
    },

    hideModal() {
        document.getElementById('pdfPreviewModal')?.classList.add('hidden');
        this.removeRealtimeUpdateListeners();
    },

    removeRealtimeUpdateListeners() {
        const inputs = [
            'patientName', 'patientAge', 'assessmentDate', 'clinicianName',
            'clinicalSummary', 'exerciseProtocol', 'exerciseSchedule', 
            'additionalNotes', 'treatmentGoals', 'followUpNotes'
        ];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.removeEventListener('input', () => this.generateTablePreview());
            }
        });
    },

    handleSaveChanges() {
        this.generateTablePreview();
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

    generateTablePreview() {
        const reportPreview = document.getElementById('reportPreview');
        if (!reportPreview) return;

        let previewHTML = this.generatePatientInfoHTML();
        previewHTML += this.generateMeasurementTableHTML();
        
        const clinicalSummary = this.getInputValue('clinicalSummary');
        if (clinicalSummary) {
            previewHTML += this.createPreviewSection('Clinical Assessment Summary', clinicalSummary);
        }
        
        const exerciseProtocol = this.getInputValue('exerciseProtocol');
        if (exerciseProtocol) {
            previewHTML += this.createPreviewSection('Exercise Protocol', exerciseProtocol);
        }
        
        const additionalNotes = this.getInputValue('additionalNotes');
        if (additionalNotes) {
            previewHTML += this.createPreviewSection('Additional Notes', additionalNotes);
        }
        
        reportPreview.innerHTML = previewHTML;
    },

    createPreviewSection(title, content) {
        return `
            <div class="report-section">
                <h4>${title}</h4>
                <pre style="white-space: pre-wrap; font-family: inherit;">${content}</pre>
            </div>
        `;
    },

    generatePatientInfoHTML() {
        const patientName = this.getInputValue('patientName', 'Patient Name');
        const patientAge = this.getInputValue('patientAge', 'Age');
        const assessmentDate = this.getInputValue('assessmentDate') ? 
            new Date(this.getInputValue('assessmentDate')).toLocaleDateString() : 
            new Date().toLocaleDateString();
        const clinicianName = this.getInputValue('clinicianName', 'Clinician Name');
        
        return `
            <div class="report-section">
                <h4>Patient Information</h4>
                <p><strong>Name:</strong> ${patientName}</p>
                <p><strong>Age:</strong> ${patientAge}</p>
                <p><strong>Assessment Date:</strong> ${assessmentDate}</p>
                <p><strong>Assessed by:</strong> ${clinicianName}</p>
            </div>
        `;
    },

    generateMeasurementTableHTML() {
        if (!AppState.postureAnalysis) return '';

        const frontMeas = AppState.postureAnalysis.front?.measurements || {};
        const sideMeas = AppState.postureAnalysis.side?.measurements || {};
        const backMeas = AppState.postureAnalysis.back?.measurements || {};
        
        const headerCellStyle = "border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f5f5f5; color: #333;";
        const centerHeaderCellStyle = "border: 1px solid #ddd; padding: 8px; text-align: center; background-color: #f5f5f5; color: #333;";
        const dataCellStyle = "border: 1px solid #ddd; padding: 8px; color: #333;";
        const centerDataCellStyle = "border: 1px solid #ddd; padding: 8px; text-align: center; color: #333;";

        return `
            <div class="report-section">
                <h4>Postural Measurements Summary</h4>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <thead>
                        <tr>
                            <th style="${headerCellStyle}">Parameter</th>
                            <th style="${centerHeaderCellStyle}">Front View</th>
                            <th style="${centerHeaderCellStyle}">Side View</th>
                            <th style="${centerHeaderCellStyle}">Back View</th>
                            <th style="${centerHeaderCellStyle}">Normal Range</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background-color: #ffffff;"> 
                            <td style="${dataCellStyle}">Neck Deviation</td> 
                            <td style="${centerDataCellStyle}">${frontMeas.neckDeviation || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}">${sideMeas.neckForward || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}">${backMeas.neckDeviation || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}"><5° / <15°</td> 
                        </tr>
                        <tr style="background-color: #f9f9f9;"> 
                            <td style="${dataCellStyle}">Shoulder Alignment</td> 
                            <td style="${centerDataCellStyle}">${frontMeas.shoulderHeightDiff ? (180 - frontMeas.shoulderHeightDiff).toFixed(1) + '°' : 'N/A'}</td> 
                            <td style="${centerDataCellStyle}">-</td> 
                            <td style="${centerDataCellStyle}">${backMeas.shoulderHeightDiff ? (180 - backMeas.shoulderHeightDiff).toFixed(1) + '°' : 'N/A'}</td> 
                            <td style="${centerDataCellStyle}">>178°</td> 
                        </tr>
                        <tr style="background-color: #ffffff;"> 
                            <td style="${dataCellStyle}">Spinal Curvature</td> 
                            <td style="${centerDataCellStyle}">-</td> 
                            <td style="${centerDataCellStyle}">${sideMeas.backBend || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}">-</td> 
                            <td style="${centerDataCellStyle}"><20°</td> 
                        </tr>
                        <tr style="background-color: #f9f9f9;"> 
                            <td style="${dataCellStyle}">Hip Alignment</td> 
                            <td style="${centerDataCellStyle}">${frontMeas.hipHeightDiff ? (180 - frontMeas.hipHeightDiff).toFixed(1) + '°' : 'N/A'}</td> 
                            <td style="${centerDataCellStyle}">-</td> 
                            <td style="${centerDataCellStyle}">${backMeas.hipHeightDiff ? (180 - backMeas.hipHeightDiff).toFixed(1) + '°' : 'N/A'}</td> 
                            <td style="${centerDataCellStyle}">>178°</td> 
                        </tr>
                        <tr style="background-color: #ffffff;"> 
                            <td style="${dataCellStyle}">Knee Alignment</td> 
                            <td style="${centerDataCellStyle}">L:${frontMeas.leftKneeAngle || 'N/A'}° R:${frontMeas.rightKneeAngle || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}">${sideMeas.kneeBend || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}">L:${backMeas.leftKneeAngle || 'N/A'}° R:${backMeas.rightKneeAngle || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}"><8° / <10°</td> 
                        </tr>
                        <tr style="background-color: #f9f9f9;"> 
                            <td style="${dataCellStyle}">Ankle Alignment</td> 
                            <td style="${centerDataCellStyle}">L:${frontMeas.leftAnkleAlignment || 'N/A'}° R:${frontMeas.rightAnkleAlignment || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}">${sideMeas.ankleAlignment || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}">L:${backMeas.leftAnkleAlignment || 'N/A'}° R:${backMeas.rightAnkleAlignment || 'N/A'}°</td> 
                            <td style="${centerDataCellStyle}"><5° / <8°</td> 
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    },

    getInputValue(id, defaultValue = '') {
        const element = document.getElementById(id);
        const value = element ? (element.value || element.textContent || '') : '';
        return value.trim() || defaultValue;
    },

    generateTableFormatPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const patientName = this.getInputValue('patientName', 'Patient');
            const patientAge = this.getInputValue('patientAge', 'N/A');
            const assessmentDate = this.getInputValue('assessmentDate') ? 
                new Date(this.getInputValue('assessmentDate')).toLocaleDateString() : new Date().toLocaleDateString();
            const clinicianName = this.getInputValue('clinicianName', 'Clinician');
            
            doc.setFontSize(20);
            doc.setTextColor(102, 126, 234);
            doc.text('Clinical Postural Assessment Report', 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text(`Patient: ${patientName}`, 105, 30, { align: 'center' });
            doc.text(`Age: ${patientAge} | Assessment Date: ${assessmentDate}`, 105, 38, { align: 'center' });
            doc.text(`Assessed by: ${clinicianName}`, 105, 46, { align: 'center' });

            let yPosition = 65;
            yPosition = this.addMeasurementTable(doc, yPosition);
            
            const clinicalSummary = this.getInputValue('clinicalSummary');
            if (clinicalSummary) {
                yPosition = this.addSectionToPDF(doc, 'CLINICAL ASSESSMENT SUMMARY', yPosition);
                yPosition = this.addTextToPDF(doc, clinicalSummary, yPosition, 170);
            }
            
            const exerciseProtocol = this.getInputValue('exerciseProtocol');
            if (exerciseProtocol) {
                yPosition = this.addSectionToPDF(doc, 'EXERCISE PROTOCOL', yPosition);
                yPosition = this.addTextToPDF(doc, exerciseProtocol, yPosition, 170);
            }
            
            const additionalNotes = this.getInputValue('additionalNotes');
            if (additionalNotes) {
                yPosition = this.addSectionToPDF(doc, 'ADDITIONAL NOTES', yPosition);
                yPosition = this.addTextToPDF(doc, additionalNotes, yPosition, 170);
            }

            const filename = `posture-report-${patientName.replace(/\s/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            console.log('Table format PDF generated successfully:', filename);
        } catch (error) {
            console.error('Error generating table PDF:', error);
            alert('Error generating PDF report. Please try again.');
        }
    },

    addMeasurementTable(doc, yPosition) {
        if (!AppState.postureAnalysis) return yPosition;

        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text('POSTURAL MEASUREMENTS SUMMARY', 20, yPosition);
        yPosition += 15;

        const startX = 15;
        const colWidths = [50, 30, 30, 30, 35];
        const rowHeight = 8;
        const headers = ['Parameter', 'Front View', 'Side View', 'Back View', 'Normal Range'];
        
        this.drawTableRow(doc, headers, startX, yPosition, colWidths, rowHeight, true);
        yPosition += rowHeight;

        const frontMeas = AppState.postureAnalysis.front?.measurements || {};
        const sideMeas = AppState.postureAnalysis.side?.measurements || {};
        const backMeas = AppState.postureAnalysis.back?.measurements || {};

        const tableData = [
            ['Neck Deviation', `${frontMeas.neckDeviation||'N/A'}°`, `${sideMeas.neckForward||'N/A'}°`, `${backMeas.neckDeviation||'N/A'}°`, '<5°/<15°'],
            ['Shoulder Alignment', frontMeas.shoulderHeightDiff?`${(180-frontMeas.shoulderHeightDiff).toFixed(1)}°`:'N/A', '-', backMeas.shoulderHeightDiff?`${(180-backMeas.shoulderHeightDiff).toFixed(1)}°`:'N/A', '>178°'],
            ['Spinal Curvature', '-', `${sideMeas.backBend||'N/A'}°`, '-', '<20°'],
            ['Hip Alignment', frontMeas.hipHeightDiff?`${(180-frontMeas.hipHeightDiff).toFixed(1)}°`:'N/A', '-', backMeas.hipHeightDiff?`${(180-backMeas.hipHeightDiff).toFixed(1)}°`:'N/A', '>178°'],
            ['Knee Alignment', `L:${frontMeas.leftKneeAngle||'N/A'}° R:${frontMeas.rightKneeAngle||'N/A'}°`, `${sideMeas.kneeBend||'N/A'}°`, `L:${backMeas.leftKneeAngle||'N/A'}° R:${backMeas.rightKneeAngle||'N/A'}°`, '<8°/<10°'],
            ['Ankle Alignment', `L:${frontMeas.leftAnkleAlignment||'N/A'}° R:${frontMeas.rightAnkleAlignment||'N/A'}°`, `${sideMeas.ankleAlignment||'N/A'}°`, `L:${backMeas.leftAnkleAlignment||'N/A'}° R:${backMeas.rightAnkleAlignment||'N/A'}°`, '<5°/<8°']
        ];

        tableData.forEach((row, index) => {
            this.drawTableRow(doc, row, startX, yPosition, colWidths, rowHeight, false, index % 2 !== 0);
            yPosition += rowHeight;
        });

        return yPosition + 15;
    },

    drawTableRow(doc, data, startX, y, colWidths, rowHeight, isHeader = false, isAlt = false) {
        let currentX = startX;
        if (isHeader) doc.setFillColor(245, 245, 245); // Light gray for header
        else if (isAlt) doc.setFillColor(249, 249, 249); // Very light gray for alternating rows
        else doc.setFillColor(255, 255, 255); // White for regular rows
        
        data.forEach((cell, i) => {
            doc.rect(currentX, y - rowHeight + 2, colWidths[i], rowHeight, 'F');
            doc.setDrawColor(200, 200, 200); // Light gray borders instead of black
            doc.rect(currentX, y - rowHeight + 2, colWidths[i], rowHeight, 'S');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(isHeader ? 8 : 7);
            const textY = y - rowHeight/2 + 1.5;
            doc.text(cell, currentX + (i === 0 ? 2 : colWidths[i]/2), textY, { align: i === 0 ? 'left' : 'center' });
            currentX += colWidths[i];
        });
    },

    addSectionToPDF(doc, title, yPosition) {
        if (yPosition > 270) { doc.addPage(); yPosition = 20; }
        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text(title, 20, yPosition);
        return yPosition + 10;
    },

    addTextToPDF(doc, text, yPosition, maxWidth) {
        if (!text) return yPosition;
        doc.setFontSize(9);
        doc.setTextColor(70);
        const lines = doc.splitTextToSize(text, maxWidth);
        for (let i = 0; i < lines.length; i++) {
            if (yPosition > 280) { doc.addPage(); yPosition = 20; }
            doc.text(lines[i], 20, yPosition);
            yPosition += 4.5;
        }
        return yPosition + 8;
    }
};

document.addEventListener('DOMContentLoaded', () => PDFGenerator.init());