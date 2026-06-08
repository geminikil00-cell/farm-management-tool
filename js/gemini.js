// Gemini API Service
// Note: Replace YOUR_GEMINI_API_KEY with your actual API key from https://ai.google.dev/
const GEMINI_API_KEY = 'AIzaSyDW2mTvfdXx7ymJ66V4gKGznZLZ3SFTFh8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

window.GeminiAPI = {
    // Call Gemini API to analyze farm data
    async analyzeFarmData(cyclesData) {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
            throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in js/gemini.js');
        }

        // Prepare the data summary for analysis
        const dataSummary = {
            totalCycles: cyclesData.length,
            topPerformers: cyclesData.slice(0, 3).map(c => ({
                plot: c.plotName,
                year: c.year,
                cycle: c.cycle,
                profitPerKg: c.profitPerKg,
                survivalRate: c.survivalRate,
                roi: c.roi,
                factors: {
                    sprayFrequency: c.sprayFrequency,
                    irrigationEvents: c.irrCount,
                    waterVolume: c.totalWaterLiters,
                    duration: c.durationDays,
                    plantsCount: c.planted
                }
            })),
            bottomPerformers: cyclesData.slice(-3).reverse().map(c => ({
                plot: c.plotName,
                year: c.year,
                cycle: c.cycle,
                profitPerKg: c.profitPerKg,
                survivalRate: c.survivalRate,
                roi: c.roi,
                factors: {
                    sprayFrequency: c.sprayFrequency,
                    irrigationEvents: c.irrCount,
                    waterVolume: c.totalWaterLiters,
                    duration: c.durationDays,
                    plantsCount: c.planted
                }
            })),
            averages: {
                avgProfitPerKg: cyclesData.reduce((s, c) => s + c.profitPerKg, 0) / cyclesData.length,
                avgSurvivalRate: cyclesData.reduce((s, c) => s + c.survivalRate, 0) / cyclesData.length,
                avgROI: cyclesData.reduce((s, c) => s + c.roi, 0) / cyclesData.length,
                avgDuration: cyclesData.reduce((s, c) => s + c.durationDays, 0) / cyclesData.length
            }
        };

        const prompt = `You are an agricultural data analyst. Analyze the following farm cycle performance data and provide:

1. **Key Insights**: The most interesting patterns and findings from the data
2. **Success Factors**: What makes top-performing cycles successful
3. **Improvement Opportunities**: Areas where underperforming cycles could improve
4. **Recommendations**: Actionable recommendations based on the analysis

Farm Cycle Data:
- Total Cycles Analyzed: ${dataSummary.totalCycles}
- Average Profit per kg: $${dataSummary.averages.avgProfitPerKg.toFixed(2)}
- Average Survival Rate: ${dataSummary.averages.avgSurvivalRate.toFixed(1)}%
- Average ROI: ${dataSummary.averages.avgROI.toFixed(1)}%

Top 3 Performers:
${dataSummary.topPerformers.map((p, i) => `
${i + 1}. ${p.plot} (Year ${p.year}, Cycle ${p.cycle}):
   - Profit/kg: $${p.profitPerKg.toFixed(2)}
   - Survival Rate: ${p.survivalRate.toFixed(1)}%
   - ROI: ${p.roi.toFixed(1)}%
   - Spray Frequency: ${p.factors.sprayFrequency.toFixed(2)}/week
   - Irrigation Events: ${p.factors.irrigationEvents}
   - Water Volume: ${p.factors.waterVolume.toFixed(0)}L
   - Duration: ${p.factors.duration} days
   - Plants: ${p.factors.plantsCount}
`).join('')}

Bottom 3 Performers:
${dataSummary.bottomPerformers.map((p, i) => `
${i + 1}. ${p.plot} (Year ${p.year}, Cycle ${p.cycle}):
   - Profit/kg: $${p.profitPerKg.toFixed(2)}
   - Survival Rate: ${p.survivalRate.toFixed(1)}%
   - ROI: ${p.roi.toFixed(1)}%
   - Spray Frequency: ${p.factors.sprayFrequency.toFixed(2)}/week
   - Irrigation Events: ${p.factors.irrigationEvents}
   - Water Volume: ${p.factors.waterVolume.toFixed(0)}L
   - Duration: ${p.factors.duration} days
   - Plants: ${p.factors.plantsCount}
`).join('')}

Please provide a comprehensive analysis with clear sections and actionable insights. Format your response with clear headings and bullet points.`;

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to get response from Gemini API');
            }

            const data = await response.json();
            return data.candidates[0]?.content?.parts[0]?.text || 'No response from Gemini API';
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    }
};

