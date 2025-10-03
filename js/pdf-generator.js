// pdf-generator.js - Enhanced PDF Generator with Ankle Analysis

const PDFGenerator = {
    currentDataSource: null,

    init() {
        this.initializeModalEventListeners();
        console.log('Enhanced PDF Generator initialized with ankle analysis');
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
        
        let deformityCount = 0;
        if (AppState.postureAnalysis && AppState.postureAnalysis.deformitySummary) {
            const summary = AppState.postureAnalysis.deformitySummary;
            deformityCount = summary.frontalPlane.length + 
                           summary.sagittalPlane.length + 
                           summary.bilateralComparison.length;
        }
        
        reportPreview.innerHTML = `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
                <h3>Comprehensive Clinical Report Preview for ${patientName}</h3>
                <p><strong>The final PDF will include:</strong></p>
                <ul style="margin-left: 20px;">
                    <li>Detailed anatomical avatars with visual annotations</li>
                    <li>All clinical measurements in both degrees and centimeters</li>
                    <li>Left and right side view comparisons</li>
                    <li><strong style="color: #dc3545;">${deformityCount} directional deformities detected</strong></li>
                    <li><strong style="color: #28a745;">Knee analysis (valgus/varus + flexion/extension)</strong></li>
                    <li><strong style="color: #17a2b8;">Ankle analysis (pronation/supination)</strong></li>
                    <li>Comprehensive data table</li>
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

        if (view === 'sideLeft' || view === 'sideRight') {
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
        const views = { 
            front: 40, 
            sideLeft: 85, 
            sideRight: 130, 
            back: 175 
        };

        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text('Postural Analysis Visual Summary', 105, yPos, { align: 'center' });
        yPos += 8;

        Object.entries(views).forEach(([view, x]) => {
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            let label = view.charAt(0).toUpperCase() + view.slice(1);
            if (view === 'sideLeft') label = 'Side Left';
            if (view === 'sideRight') label = 'Side Right';
            doc.text(label, x, yPos, { align: 'center' });
            this.drawAvatar(doc, x, yPos + 5, view);
        });

        const avatarTop = yPos + 5;
        doc.setLineWidth(0.5);
        doc.setTextColor(220, 53, 69);
        doc.setFontSize(6);

        // FRONT VIEW ANNOTATIONS
        const frontAnalysis = analysis.front;
        if (frontAnalysis && frontAnalysis.measurements) {
            const x = views.front;
            
            if (frontAnalysis.measurements.earPinnaeLevelCm && parseFloat(frontAnalysis.measurements.earPinnaeLevelCm) > 1) {
                doc.line(x - 10, avatarTop + 8, x + 10, avatarTop + 12);
                doc.text(`Ear: ${frontAnalysis.measurements.earPinnaeLevelCm}cm`, x - 18, avatarTop + 8);
            }

            if (frontAnalysis.measurements.shoulderLevelCm && parseFloat(frontAnalysis.measurements.shoulderLevelCm) > 1.5) {
                doc.text(`Sh: ${frontAnalysis.measurements.shoulderLevelCm}cm`, x + 17, avatarTop + 30);
            }

            if (frontAnalysis.measurements.pelvicObliquityCm && parseFloat(frontAnalysis.measurements.pelvicObliquityCm) > 1.5) {
                doc.text(`Pelv: ${frontAnalysis.measurements.pelvicObliquityCm}cm`, x + 14, avatarTop + 55);
            }
        }
        
        // SIDE LEFT VIEW ANNOTATIONS
        const sideLeftAnalysis = analysis.sideLeft;
        if (sideLeftAnalysis && sideLeftAnalysis.measurements) {
            const x = views.sideLeft;
            
            if (sideLeftAnalysis.measurements.forwardNeckCm && parseFloat(sideLeftAnalysis.measurements.forwardNeckCm) > 4) {
                doc.text(`Neck: ${sideLeftAnalysis.measurements.forwardNeckCm}cm`, x - 18, avatarTop + 18);
            }

            if (sideLeftAnalysis.measurements.thoracicCurvature) {
                const angle = parseFloat(sideLeftAnalysis.measurements.thoracicCurvature);
                if (angle > 40 || angle < 20) {
                    doc.text(`T: ${angle.toFixed(0)}`, x - 15, avatarTop + 45);
                }
            }

            if (sideLeftAnalysis.measurements.lumbarCurvature) {
                const angle = parseFloat(sideLeftAnalysis.measurements.lumbarCurvature);
                if (angle > 60 || angle < 40) {
                    doc.text(`L: ${angle.toFixed(0)}`, x - 15, avatarTop + 60);
                }
            }
        }

        // SIDE RIGHT VIEW ANNOTATIONS
        const sideRightAnalysis = analysis.sideRight;
        if (sideRightAnalysis && sideRightAnalysis.measurements) {
            const x = views.sideRight;
            
            if (sideRightAnalysis.measurements.forwardNeckCm && parseFloat(sideRightAnalysis.measurements.forwardNeckCm) > 4) {
                doc.text(`Neck: ${sideRightAnalysis.measurements.forwardNeckCm}cm`, x - 18, avatarTop + 18);
            }

            if (sideRightAnalysis.measurements.thoracicCurvature) {
                const angle = parseFloat(sideRightAnalysis.measurements.thoracicCurvature);
                if (angle > 40 || angle < 20) {
                    doc.text(`T: ${angle.toFixed(0)}`, x - 15, avatarTop + 45);
                }
            }

            if (sideRightAnalysis.measurements.lumbarCurvature) {
                const angle = parseFloat(sideRightAnalysis.measurements.lumbarCurvature);
                if (angle > 60 || angle < 40) {
                    doc.text(`L: ${angle.toFixed(0)}`, x - 15, avatarTop + 60);
                }
            }
        }

        // BACK VIEW ANNOTATIONS
        const backAnalysis = analysis.back;
        if (backAnalysis && backAnalysis.measurements) {
            const x = views.back;
            
            if (backAnalysis.measurements.scapularLevelCm && parseFloat(backAnalysis.measurements.scapularLevelCm) > 1.5) {
                doc.text(`Scap: ${backAnalysis.measurements.scapularLevelCm}cm`, x + 17, avatarTop + 30);
            }

            if (backAnalysis.measurements.psisLevelCm && parseFloat(backAnalysis.measurements.psisLevelCm) > 1.5) {
                doc.text(`PSIS: ${backAnalysis.measurements.psisLevelCm}cm`, x + 14, avatarTop + 55);
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

        const tableHeaders = ["View", "Measurement", "Value (°)", "Value (cm)"];
        const colWidths = [22, 70, 25, 25];
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
            { view: 'Front', key: 'earPinnaeLevel', cmKey: 'earPinnaeLevelCm', name: 'Ear Pinnae Level' },
            { view: 'Front', key: 'neckLevel', cmKey: 'neckLevelCm', name: 'Neck Level (Lateral Dev)' },
            { view: 'Front', key: 'shoulderLevel', cmKey: 'shoulderLevelCm', name: 'Shoulder Level' },
            { view: 'Front', key: 'elbowLevel', cmKey: 'elbowLevelCm', name: 'Elbow Level' },
            { view: 'Front', key: 'pelvicObliquity', cmKey: 'pelvicObliquityCm', name: 'Pelvic Obliquity' },
            { view: 'Front', key: 'kneeLevel', cmKey: 'kneeLevelCm', name: 'Knee Level' },
            { view: 'Front', key: 'leftKneeAlignment', name: 'Left Knee Alignment' },
            { view: 'Front', key: 'rightKneeAlignment', name: 'Right Knee Alignment' },
            
            // Side Left View
            { view: 'SideL', key: 'forwardNeck', cmKey: 'forwardNeckCm', name: 'Forward Neck Posture (L)' },
            { view: 'SideL', key: 'chinForward', cmKey: 'chinForwardCm', name: 'Chin Forward (L)' },
            { view: 'SideL', key: 'shoulderPosition', name: 'Shoulder Position (L)' },
            { view: 'SideL', key: 'thoracicCurvature', name: 'Thoracic Curvature (L)' },
            { view: 'SideL', key: 'lumbarCurvature', name: 'Lumbar Curvature (L)' },
            { view: 'SideL', key: 'leftKneePosition', name: 'Left Knee Position (L)' },
            { view: 'SideL', key: 'rightKneePosition', name: 'Right Knee Position (L)' },
            
            // Side Right View
            { view: 'SideR', key: 'forwardNeck', cmKey: 'forwardNeckCm', name: 'Forward Neck Posture (R)' },
            { view: 'SideR', key: 'chinForward', cmKey: 'chinForwardCm', name: 'Chin Forward (R)' },
            { view: 'SideR', key: 'shoulderPosition', name: 'Shoulder Position (R)' },
            { view: 'SideR', key: 'thoracicCurvature', name: 'Thoracic Curvature (R)' },
            { view: 'SideR', key: 'lumbarCurvature', name: 'Lumbar Curvature (R)' },
            { view: 'SideR', key: 'leftKneePosition', name: 'Left Knee Position (R)' },
            { view: 'SideR', key: 'rightKneePosition', name: 'Right Knee Position (R)' },
            
            // Back View
            { view: 'Back', key: 'elbowLevel', cmKey: 'elbowLevelCm', name: 'Elbow Level (Back)' },
            { view: 'Back', key: 'scapularLevel', cmKey: 'scapularLevelCm', name: 'Scapular Level' },
            { view: 'Back', key: 'psisLevel', cmKey: 'psisLevelCm', name: 'PSIS Level' },
            { view: 'Back', key: 'glutealFoldAsymmetry', name: 'Gluteal Fold Asymmetry' },
            { view: 'Back', key: 'poplitealLine', cmKey: 'poplitealLineCm', name: 'Popliteal Line' },
            { view: 'Back', key: 'leftAnkleAlignment', name: 'Left Ankle Alignment' },
            { view: 'Back', key: 'rightAnkleAlignment', name: 'Right Ankle Alignment' },
        ];
        
        const analysisData = AppState.postureAnalysis;

        allMeasurements.forEach(metric => {
            let viewData;
            if (metric.view === 'SideL') {
                viewData = analysisData.sideLeft;
            } else if (metric.view === 'SideR') {
                viewData = analysisData.sideRight;
            } else {
                viewData = analysisData[metric.view.toLowerCase()];
            }
            
            if (viewData && viewData.measurements && viewData.measurements[metric.key] !== undefined) {
                let angleValue = parseFloat(viewData.measurements[metric.key]);

                let cmValue = '-';
                if (metric.cmKey && viewData.measurements[metric.cmKey]) {
                    cmValue = parseFloat(viewData.measurements[metric.cmKey]).toFixed(1);
                } else if (metric.name.includes('Gluteal')) {
                    cmValue = angleValue.toFixed(1) + '%';
                }

                xPos = 15;
                doc.setDrawColor(200, 200, 200);
                doc.line(15, yPos, 157, yPos);

                doc.setTextColor(0, 0, 0);

                const rowData = [
                    metric.view,
                    metric.name,
                    angleValue === '-' ? '-' : angleValue.toFixed(1),
                    cmValue
                ];
                
                doc.setFontSize(7);
                rowData.forEach((cell, i) => {
                    doc.text(String(cell), xPos + 1.5, yPos + 4.5);
                    xPos += colWidths[i];
                });
                yPos += rowHeight;
                
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
            }
        });
        doc.line(15, yPos, 157, yPos);

        return yPos + 5;
    },

    drawDeformitySummary(doc, yPos) {
        if (!AppState.postureAnalysis || !AppState.postureAnalysis.deformitySummary) return yPos;

        const summary = AppState.postureAnalysis.deformitySummary;

        const hasDeformities = summary.frontalPlane.length > 0 || 
                              summary.sagittalPlane.length > 0 || 
                              summary.bilateralComparison.length > 0;

        if (!hasDeformities) return yPos;

        if (yPos > 240) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(220, 53, 69);
        doc.text('DIRECTIONAL DEFORMITY SUMMARY', 15, yPos);
        yPos += 8;

        // Frontal Plane Deformities
        if (summary.frontalPlane.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(102, 126, 234);
            doc.text('Frontal Plane (Front & Back View)', 15, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);

            summary.frontalPlane.forEach(def => {
                if (yPos > 275) {
                    doc.addPage();
                    yPos = 20;
                }

                let text = `• ${def.type}: `;
                
                if (def.elevated && def.depressed) {
                    text += `${def.elevated} side higher by ${def.distance}cm (${def.angle}°), ${def.depressed} side lower by ${def.distance}cm `; 
                } else if (def.direction) {
                    text += `${def.direction} deviation`;
                    if (def.distance) text += ` by ${def.distance}cm`;
                    if (def.angle) text += ` (${def.angle}°)`;
                } else if (def.longer && def.shorter) {
                    text += `${def.longer} side LONGER by ${def.percentage}%, ${def.shorter} side SHORTER`;
                }

                const lines = doc.splitTextToSize(text, 180);
                lines.forEach(line => {
                    doc.text(line, 20, yPos);
                    yPos += 5;
                });
            });
            yPos += 3;
        }

        // Sagittal Plane Deformities
        if (summary.sagittalPlane.length > 0) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(102, 126, 234);
            doc.text('Sagittal Plane (Side Views)', 15, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);

            const leftDeformities = summary.sagittalPlane.filter(d => d.side === 'LEFT');
            const rightDeformities = summary.sagittalPlane.filter(d => d.side === 'RIGHT');

            if (leftDeformities.length > 0) {
                doc.setFont(undefined, 'bold');
                doc.text('Left Side:', 20, yPos);
                doc.setFont(undefined, 'normal');
                yPos += 5;

                leftDeformities.forEach(def => {
                    if (yPos > 275) {
                        doc.addPage();
                        yPos = 20;
                    }

                    let text = `  • ${def.type}: ${def.direction}`;
                    if (def.angle) text += ` ${def.angle}°`;
                    if (def.neckDistance) text += ` (Neck: ${def.neckDistance}cm, Chin: ${def.chinDistance}cm)`;

                    const lines = doc.splitTextToSize(text, 175);
                    lines.forEach(line => {
                        doc.text(line, 20, yPos);
                        yPos += 5;
                    });
                });
            }

            if (rightDeformities.length > 0) {
                doc.setFont(undefined, 'bold');
                doc.text('Right Side:', 20, yPos);
                doc.setFont(undefined, 'normal');
                yPos += 5;

                rightDeformities.forEach(def => {
                    if (yPos > 275) {
                        doc.addPage();
                        yPos = 20;
                    }

                    let text = `  • ${def.type}: ${def.direction}`;
                    if (def.angle) text += ` ${def.angle}°`;
                    if (def.neckDistance) text += ` (Neck: ${def.neckDistance}cm, Chin: ${def.chinDistance}cm)`;

                    const lines = doc.splitTextToSize(text, 175);
                    lines.forEach(line => {
                        doc.text(line, 20, yPos);
                        yPos += 5;
                    });
                });
            }
            yPos += 3;
        }

        // Bilateral Comparison
        if (summary.bilateralComparison.length > 0) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(220, 53, 69);
            doc.text('Bilateral Asymmetries (Left vs Right)', 15, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);

            summary.bilateralComparison.forEach(comp => {
                if (yPos > 275) {
                    doc.addPage();
                    yPos = 20;
                }

                const text = `• ${comp.type}: ${comp.moreSevere} side more severe (L: ${comp.leftValue}, R: ${comp.rightValue}, Diff: ${comp.difference})`;
                const lines = doc.splitTextToSize(text, 180);
                lines.forEach(line => {
                    doc.text(line, 20, yPos);
                    yPos += 5;
                });
            });
        }

        return yPos + 5;
    },

    drawKneeAndAnkleAnalysisSummary(doc, yPos) {
        if (!AppState.postureAnalysis || !AppState.postureAnalysis.deformitySummary) return yPos;

        const kneeAnalysis = AppState.postureAnalysis.deformitySummary.kneeAnalysis;
        const backAnalysis = AppState.postureAnalysis.back;
        
        const hasFrontData = kneeAnalysis.front && (kneeAnalysis.front.left || kneeAnalysis.front.right);
        const hasSideData = kneeAnalysis.side && (kneeAnalysis.side.left || kneeAnalysis.side.right);
        const hasAnkleData = backAnalysis && backAnalysis.measurements && 
                           (backAnalysis.measurements.leftAnkleAlignment || backAnalysis.measurements.rightAnkleAlignment);
        
        if (!hasFrontData && !hasSideData && !hasAnkleData) return yPos;

        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(40, 167, 69);
        doc.text('DETAILED KNEE & ANKLE ANALYSIS', 15, yPos);
        yPos += 8;

        // Front View - Valgus/Varus Analysis
        if (hasFrontData) {
            doc.setFontSize(12);
            doc.setTextColor(102, 126, 234);
            doc.text('Frontal Plane - Knee Alignment (Valgus/Varus)', 15, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);

            if (kneeAnalysis.front.left) {
                let leftText = `• LEFT Knee: ${kneeAnalysis.front.left.angle}° deviation`;
                if (kneeAnalysis.front.left.direction) {
                    leftText += ` - ${kneeAnalysis.front.left.direction}`;
                }
                const leftLines = doc.splitTextToSize(leftText, 180);
                leftLines.forEach(line => {
                    if (yPos > 275) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, 20, yPos);
                    yPos += 5;
                });
            }

            if (kneeAnalysis.front.right) {
                let rightText = `• RIGHT Knee: ${kneeAnalysis.front.right.angle}° deviation`;
                if (kneeAnalysis.front.right.direction) {
                    rightText += ` - ${kneeAnalysis.front.right.direction}`;
                }
                const rightLines = doc.splitTextToSize(rightText, 180);
                rightLines.forEach(line => {
                    if (yPos > 275) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, 20, yPos);
                    yPos += 5;
                });
            }

            doc.setFont(undefined, 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Note: Valgus (inward/knocked knees) indicates knees pointing toward each other.', 20, yPos);
            yPos += 4;
            doc.text('Varus (outward/bow-legged) indicates knees pointing away from each other.', 20, yPos);
            yPos += 7;
            doc.setFont(undefined, 'normal');
        }

        // Side View - Flexion/Extension Analysis
        if (hasSideData) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(102, 126, 234);
            doc.text('Sagittal Plane - Knee Flexion/Extension', 15, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);

            if (kneeAnalysis.side.left) {
                doc.setFont(undefined, 'bold');
                doc.text('From Left Side View:', 20, yPos);
                doc.setFont(undefined, 'normal');
                yPos += 5;

                if (kneeAnalysis.side.left.angle) {
                    let leftKneeText = `  • LEFT Knee: ${kneeAnalysis.side.left.angle}° - ${kneeAnalysis.side.left.direction || 'NEUTRAL'}`;
                    doc.text(leftKneeText, 20, yPos);
                    yPos += 5;
                }

                if (kneeAnalysis.side.left.rightAngle) {
                    let rightKneeText = `  • RIGHT Knee: ${kneeAnalysis.side.left.rightAngle}° - ${kneeAnalysis.side.left.rightDirection || 'NEUTRAL'}`;
                    doc.text(rightKneeText, 20, yPos);
                    yPos += 5;
                }
            }

            if (kneeAnalysis.side.right) {
                doc.setFont(undefined, 'bold');
                doc.text('From Right Side View:', 20, yPos);
                doc.setFont(undefined, 'normal');
                yPos += 5;

                if (kneeAnalysis.side.right.angle) {
                    let leftKneeText = `  • LEFT Knee: ${kneeAnalysis.side.right.angle}° - ${kneeAnalysis.side.right.direction || 'NEUTRAL'}`;
                    doc.text(leftKneeText, 20, yPos);
                    yPos += 5;
                }

                if (kneeAnalysis.side.right.rightAngle) {
                    let rightKneeText = `  • RIGHT Knee: ${kneeAnalysis.side.right.rightAngle}° - ${kneeAnalysis.side.right.rightDirection || 'NEUTRAL'}`;
                    doc.text(rightKneeText, 20, yPos);
                    yPos += 5;
                }
            }

            doc.setFont(undefined, 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Note: Flexion indicates bent knee. Hyperextension (recurvatum) indicates knee bent backwards.', 20, yPos);
            yPos += 7;
            doc.setFont(undefined, 'normal');
        }

        // Back View - Ankle Pronation/Supination Analysis
        if (hasAnkleData) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(23, 162, 184);
            doc.text('Posterior View - Ankle Alignment (Pronation/Supination)', 15, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);

            if (backAnalysis.measurements.leftAnkleAlignment) {
                let leftAnkleText = `• LEFT Ankle: ${backAnalysis.measurements.leftAnkleAlignment}° deviation`;
                if (backAnalysis.measurements.leftAnkleDirection) {
                    leftAnkleText += ` - ${backAnalysis.measurements.leftAnkleDirection}`;
                }
                const leftLines = doc.splitTextToSize(leftAnkleText, 180);
                leftLines.forEach(line => {
                    if (yPos > 275) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, 20, yPos);
                    yPos += 5;
                });
            }

            if (backAnalysis.measurements.rightAnkleAlignment) {
                let rightAnkleText = `• RIGHT Ankle: ${backAnalysis.measurements.rightAnkleAlignment}° deviation`;
                if (backAnalysis.measurements.rightAnkleDirection) {
                    rightAnkleText += ` - ${backAnalysis.measurements.rightAnkleDirection}`;
                }
                const rightLines = doc.splitTextToSize(rightAnkleText, 180);
                rightLines.forEach(line => {
                    if (yPos > 275) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, 20, yPos);
                    yPos += 5;
                });
            }

            doc.setFont(undefined, 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Note: Pronation (inward) indicates ankle rolling inward with arch collapse.', 20, yPos);
            yPos += 4;
            doc.text('Supination (outward) indicates ankle rolling outward with high arch.', 20, yPos);
            yPos += 7;
            doc.setFont(undefined, 'normal');
        }

        return yPos;
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

            // Directional Deformity Summary
            yPos = this.drawDeformitySummary(doc, yPos);

            // Detailed Knee & Ankle Analysis
            yPos = this.drawKneeAndAnkleAnalysisSummary(doc, yPos);

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

            // Add side view comparison section if both sides analyzed
            if (AppState.postureAnalysis.sideLeft && AppState.postureAnalysis.sideRight) {
                if (yPos > 230) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.setFillColor(118, 75, 162);
                doc.rect(15, yPos, 180, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.text('BILATERAL SIDE VIEW COMPARISON', 20, yPos + 5.5);
                yPos += 12;
                
                doc.setFontSize(9);
                doc.setTextColor(50, 50, 50);
                
                const leftMeasurements = AppState.postureAnalysis.sideLeft.measurements;
                const rightMeasurements = AppState.postureAnalysis.sideRight.measurements;
                
                let comparisonText = 'Side-to-side comparison analysis:\n\n';
                
                const leftNeck = parseFloat(leftMeasurements.forwardNeck);
                const rightNeck = parseFloat(rightMeasurements.forwardNeck);
                const neckDiff = Math.abs(leftNeck - rightNeck);
                if (neckDiff > 3) {
                    const moreSevere = leftNeck > rightNeck ? 'LEFT' : 'RIGHT';
                    comparisonText += `• Forward neck asymmetry detected: ${moreSevere} side more severe with ${neckDiff.toFixed(1)}° difference (Left: ${leftNeck.toFixed(1)}°, Right: ${rightNeck.toFixed(1)}°).\n`;
                }
                
                const leftThoracic = parseFloat(leftMeasurements.thoracicCurvature);
                const rightThoracic = parseFloat(rightMeasurements.thoracicCurvature);
                const thoracicDiff = Math.abs(leftThoracic - rightThoracic);
                if (thoracicDiff > 5) {
                    const moreSevere = leftThoracic > rightThoracic ? 'LEFT' : 'RIGHT';
                    comparisonText += `• Thoracic curvature asymmetry: ${moreSevere} side shows ${thoracicDiff.toFixed(1)}° greater curvature (Left: ${leftThoracic.toFixed(1)}°, Right: ${rightThoracic.toFixed(1)}°).\n`;
                }
                
                const leftLumbar = parseFloat(leftMeasurements.lumbarCurvature);
                const rightLumbar = parseFloat(rightMeasurements.lumbarCurvature);
                const lumbarDiff = Math.abs(leftLumbar - rightLumbar);
                if (lumbarDiff > 5) {
                    const moreSevere = leftLumbar > rightLumbar ? 'LEFT' : 'RIGHT';
                    comparisonText += `• Lumbar curvature asymmetry: ${moreSevere} side shows ${lumbarDiff.toFixed(1)}° greater lordosis (Left: ${leftLumbar.toFixed(1)}°, Right: ${rightLumbar.toFixed(1)}°).\n`;
                }
                
                const leftShoulder = parseFloat(leftMeasurements.shoulderPosition);
                const rightShoulder = parseFloat(rightMeasurements.shoulderPosition);
                const shoulderDiff = Math.abs(leftShoulder - rightShoulder);
                if (shoulderDiff > 5) {
                    const moreSevere = leftShoulder > rightShoulder ? 'LEFT' : 'RIGHT';
                    comparisonText += `• Shoulder position asymmetry: ${moreSevere} side shows ${shoulderDiff.toFixed(1)}° greater deviation (Left: ${leftShoulder.toFixed(1)}°, Right: ${rightShoulder.toFixed(1)}°).\n`;
                }
                
                if (neckDiff <= 3 && thoracicDiff <= 5 && lumbarDiff <= 5 && shoulderDiff <= 5) {
                    comparisonText += '• Bilateral sagittal plane measurements are symmetrical within normal limits.\n';
                } else {
                    comparisonText += '\nRecommendation: Bilateral asymmetries suggest rotational or postural compensation patterns that should be addressed through targeted corrective exercises.\n';
                }
                
                const comparisonLines = doc.splitTextToSize(comparisonText, 175);
                comparisonLines.forEach(line => {
                    if (yPos > 280) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, 20, yPos);
                    yPos += 5;
                });
            }

            // Additional notes sections
            const additionalNotes = this.getInputValue('additionalNotes');
            if (additionalNotes) {
                yPos = this.addStyledSectionToPDF(doc, 'ADDITIONAL CLINICAL NOTES', additionalNotes, yPos, [108, 117, 125]);
            }

            const treatmentGoals = this.getInputValue('treatmentGoals');
            if (treatmentGoals) {
                yPos = this.addStyledSectionToPDF(doc, 'TREATMENT GOALS', treatmentGoals, yPos, [23, 162, 184]);
            }

            const followUpNotes = this.getInputValue('followUpNotes');
            if (followUpNotes) {
                yPos = this.addStyledSectionToPDF(doc, 'FOLLOW-UP RECOMMENDATIONS', followUpNotes, yPos, [255, 193, 7]);
            }

            // Footer on last page
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Clinical Posture Analysis Report - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
                doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 295, { align: 'center' });
            }

            const filename = `comprehensive-posture-report-${patientName.replace(/\s/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            console.log('Comprehensive clinical PDF with knee and ankle analysis generated:', filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please check the console for details.');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PDFGenerator.init();
});