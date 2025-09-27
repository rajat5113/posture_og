const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Middleware to serve static files
app.use(express.static(__dirname));

// Main route - serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Clinical Posture Analysis Server is running',
        timestamp: new Date().toISOString(),
        openai_configured: !!process.env.OPENAI_API_KEY
    });
});

// API endpoint for ChatGPT-4 Mini integration
app.post('/api/generate-summary', async (req, res) => {
    try {
        const { analysisData } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: 'OpenAI API key not configured',
                summary: 'Error: OpenAI API key missing. Please add OPENAI_API_KEY to your .env file.',
                exercises: 'Unable to generate exercises without API key.'
            });
        }

        if (!analysisData) {
            return res.status(400).json({
                error: 'Analysis data is required',
                summary: 'No analysis data provided.',
                exercises: 'Cannot generate recommendations without analysis data.'
            });
        }

        // Format the analysis data for ChatGPT
        let dataString = "Clinical Posture Analysis Data:\n\n";
        dataString += "Measurements:\n";
        
        const allMeasurements = { 
            ...analysisData.front?.measurements, 
            ...analysisData.side?.measurements, 
            ...analysisData.back?.measurements 
        };
        
        for (const [key, value] of Object.entries(allMeasurements)) {
            dataString += `- ${key}: ${value}°\n`;
        }

        dataString += "\nIdentified Issues:\n";
        const allIssues = [
            ...(analysisData.front?.issues || []), 
            ...(analysisData.side?.issues || []), 
            ...(analysisData.back?.issues || [])
        ];
        const uniqueIssues = [...new Set(allIssues.filter(issue => !issue.includes('✓ Normal')))];
        
        if (uniqueIssues.length === 0) {
            dataString += "- No significant postural deviations detected\n";
        } else {
            uniqueIssues.forEach(issue => {
                dataString += `- ${issue}\n`;
            });
        }

        // Create the prompt for ChatGPT-4 Mini
        const prompt = `You are a clinical physiotherapy assistant. Based on the following posture analysis data, provide a professional clinical summary in exactly 200-250 words, followed by exercise recommendations in exactly 200-250 words.

Data:
${dataString}

Please respond in this exact format without any bold or italic text:
SUMMARY: [ 200-250 words about the clinical findings and their implications]

EXERCISES: [200-250 words of specific exercise recommendations with repetitions/duration]

Keep the language professional. Focus on actionable insights and evidence-based recommendations.`;

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional physiotherapy assistant providing clinical assessments and exercise recommendations.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || '';

        // Parse the response
        const summaryMatch = aiResponse.match(/SUMMARY:\s*(.*?)\s*EXERCISES:/s);
        const exercisesMatch = aiResponse.match(/EXERCISES:\s*(.*)/s);

        const summary = summaryMatch ? summaryMatch[1].trim() : "Unable to generate summary. Please check the analysis data.";
        const exercises = exercisesMatch ? exercisesMatch[1].trim() : "Unable to generate exercise recommendations.";

        res.json({
            summary,
            exercises,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generating AI summary:', error);
        res.status(500).json({
            error: 'Failed to generate AI summary',
            summary: 'Error generating summary. Please try again or check your API configuration.',
            exercises: 'Unable to generate exercise recommendations due to an error.',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🏥 Clinical Posture Analysis Server running on port ${PORT}`);
    console.log(`📊 Access the application at: http://localhost:${PORT}`);
    console.log(`🔧 Health check available at: http://localhost:${PORT}/health`);
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Development mode - server will restart on file changes`);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});