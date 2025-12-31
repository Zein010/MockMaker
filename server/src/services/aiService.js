import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Model configuration
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
      responseMimeType: "application/json"
  }
});

/**
 * Uploads a file to Google AI File Manager
 * @param {string} filePath - Local path to the file
 * @param {string} mimeType - Mime type of the file
 * @param {string} displayName - Display name for the file
 * @returns {Promise<object>} - Upload response
 */
export const uploadFileToGemini = async (filePath, mimeType, displayName) => {
    try {
        const uploadResponse = await fileManager.uploadFile(filePath, {
            mimeType,
            displayName,
        });
        console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);
        return uploadResponse.file;
    } catch (error) {
        console.error('Error uploading file to Gemini:', error);
        throw error;
    }
};

/**
 * Waits for the file to be active
 * @param {string} fileName - Resource name of the file (files/...)
 */
export const waitForFileActive = async (fileName) => {
    let file = await fileManager.getFile(fileName);
    while (file.state === "PROCESSING") {
        console.log("Processing file...");
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
        file = await fileManager.getFile(fileName);
    }
    if (file.state !== "ACTIVE") {
        throw new Error(`File processing failed state: ${file.state}`);
    }
    console.log("File is active");
    return file;
};

/**
 * Generates questions from the uploaded file
 * @param {string} fileUri - URI of the uploaded file
 * @param {number} numQuestions - Number of questions to generate
 * @param {object} [config] - Optional config { difficulty: 'Hard', manualCounts: true, distribution: { Radio: 2 } }
 * @returns {Promise<Array>} - Array of generated questions
 */
export const generateQuestions = async (fileUri, numQuestions, config) => {
    
    let instructions = "";
    
    // Safety check parsing
    let difficulty = "Medium";
    let typeInstructions = "";

    if (config) {
        if (config.difficulty) difficulty = config.difficulty;
        
        if (config.manualCounts && config.distribution) {
             typeInstructions = `You must strictly follow this distribution of question types:\n`;
             for (const [type, count] of Object.entries(config.distribution)) {
                 typeInstructions += `- ${count} questions of type "${type}"\n`;
             }
             typeInstructions += `Total questions: ${numQuestions}\n`;
        }
    }
    
    if (!typeInstructions) {
        typeInstructions = `Create ${numQuestions} distinct questions. Randomly assign types ("Radio", "MultiChoice", "Text").\n`;
    }

    let bonusInstructions = "";
    if (config && config.bonus && config.bonus.enabled) {
        bonusInstructions = `
        ALSO generate ${config.bonus.count} BONUS QUESTIONS. 
        Bonus Difficulty: ${config.bonus.difficulty}.
        Bonus Source: ${config.bonus.source}
          - If "file": Questions strictly based on the document.
          - If "inference": Deduce concepts not explicitly stated but implied.
          - If "external": General knowledge related to the topic but not in the text.
        
        Mark these clearly in the output structure.
        `;
    }

    const prompt = `
    You are an expert exam creator. 
    Analyze the provided document.
    
    SECTION 1: MAIN EXAM
    Generate ${numQuestions} questions with a Difficulty Level of: ${difficulty}.
    ${typeInstructions}
    
    SECTION 2: BONUS QUESTIONS
    ${bonusInstructions}
    
    For EACH question (Main and Bonus), you must generate 3 VARIATIONS. 
    The variations should ask the same core concept but be phrased differently or have slightly different options (if MCQ).
    
    Ensure the JSON structure exactly matches the schema below.
    - "Radio": Single correct answer.
    - "MultiChoice": Multiple correct answers.
    - "Text": Text answer (provide key keywords for grading).

    Ensure the JSON structure exactly matches the schema below.
    CRITICAL: The question text MUST be in a field named "text". Do NOT use "question" or "prompt".

    Return ONLY a JSON object with two arrays. Schema:
    {
        "questions": [
            {
                "type": "Radio" | "MultiChoice" | "Text",
                "variations": [
                    {
                        "text": "The actual question text goes here...", 
                        "options": ["Option A", "Option B", ...], 
                        "correctAnswers": ["Correct Option"] 
                    }
                ]
            }
        ],
        "bonusQuestions": [ ...same schema... ]
    }
    `;

    try {
        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: "application/pdf", // Assuming PDF based on user request, or pass dynamically if needed
                    fileUri: fileUri
                }
            },
            { text: prompt }
        ]);
        
        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error('Error generating questions:', error);
        throw error;
    }
};

export const deleteFileFromGemini = async (fileName) => {
    try {
        await fileManager.deleteFile(fileName);
        console.log(`Deleted file: ${fileName}`);
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

export const gradeTextAnswersBatch = async (items) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        responseMimeType: "application/json"
    }
  });

  const prompt = `
  You are an expert exam grader. I will provide a list of student answers to text-based questions, along with the question and the expected answer logic.
  For each item, evaluate if the student's answer is correct based on the expected answer.
  Return a JSON array of objects. Each object must have:
  - "validationId": (string) matching the input validationId
  - "isCorrect": (boolean) true if the answer is substantially correct
  - "feedback": (string) A very brief explanation (max 1 sentence).

  Items to grade:
  ${JSON.stringify(items)}

  Return ONLY valid JSON.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
      // Sometimes models wrap JSON in markdown blocks
      let cleanText = text;
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']') + 1;
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanText = text.substring(jsonStart, jsonEnd);
      }
      
      return JSON.parse(cleanText);
  } catch (e) {
      console.error("Failed to parse AI grading response", e);
      return [];
  }
};
