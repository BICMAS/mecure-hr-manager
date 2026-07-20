import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
        console.warn("API Key not found in environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateHRInsight = async (contextData: string, query: string): Promise<string> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
You are an expert HR Data Analyst for MeCure Excellence Academy.
Analyze the following JSON data context representing learner progress and courses:
${contextData}

Answer the following query or provide an executive summary based on the data.
Keep the tone professional, crisp, and actionable for managers.
Query: ${query}
`,
        });
        return response.text || "No insights generated.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Unable to generate insights at this time. Please check API configuration.";
    }
};

export const generateCourseDescription = async (title: string): Promise<string> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a short, professional course description (max 2 sentences) for a corporate training course titled: "${title}".`,
        });
        return response.text || "No description available.";
    } catch (error) {
        return "Description generation failed.";
    }
};
