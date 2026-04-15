const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// POST /api/analyze-resume
// Body: { base64: "...", mimeType: "application/pdf", jobs: [...] }
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    console.log("=== ANALYZE ROUTE HIT ===");
    console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

    const { base64, mimeType, jobs } = req.body;

    if (!base64 || !mimeType) {
      return res.status(400).json({ message: "base64 and mimeType are required" });
    }

    // Validate base64 encoding
    if (typeof base64 !== 'string' || base64.length === 0) {
      console.error("Invalid base64: not a string or empty");
      return res.status(400).json({ message: "Invalid PDF base64 encoding" });
    }

    console.log(`PDF size: ${(base64.length / 1024 / 1024).toFixed(2)}MB, Type: ${mimeType}`);

    // Convert DOCX to PDF note - for now, only accept PDF
    const allowedMimeTypes = ["application/pdf"];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({
        message: "Only PDF files are currently supported for AI analysis. Please convert DOCX to PDF first."
      });
    }

    const jobListText = Array.isArray(jobs) && jobs.length > 0
      ? jobs.map((j, i) =>
          `${i + 1}. ID: ${j._id} | Title: ${j.title} | Company: ${j.company} | Location: ${j.location} | Skills: ${(j.skills || []).join(", ")} | Eligibility: ${j.eligibility || "N/A"}`
        ).join("\n")
      : "No jobs available currently.";

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: "application/pdf",
                data: base64
              }
            },
            {
              text: buildPrompt(jobListText)
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2500,
        responseMimeType: "application/json"
      }
    };

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return res.status(500).json({ message: "API key not configured" });
    }

    // Using Gemini 2.5 Flash
    // Correct version (v1beta)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log("Calling Gemini API with 2.5-flash model...");
    console.log("URL:", url.substring(0, 80) + "...[key hidden]");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    console.log("Gemini response status:", response.status);

    // Handle 404 before trying to parse JSON
    if (response.status === 404) {
      console.error("Model not found (404): gemini-1.5-flash endpoint issue");
      return res.status(502).json({ message: "Model not found. The Gemini API endpoint may be unavailable." });
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error("Failed to parse JSON response:", jsonErr.message);
      console.error("Response status:", response.status);
      return res.status(502).json({ message: "Invalid response from Gemini API" });
    }

    console.log("Gemini response data:", JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      console.error("Gemini API error:");
      console.error("Status:", response.status);
      console.error("Error details:", JSON.stringify(data, null, 2));
      
      // Better error message based on status code
      let errorMessage = "AI analysis failed";
      if (response.status === 400) {
        errorMessage = "Invalid request format: " + (data.error?.message || "Check request body");
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = "API key issue: Please verify your API key is valid and has quota.";
      } else if (response.status === 429) {
        errorMessage = "Rate limited. Please try again in a moment.";
      } else {
        errorMessage = data.error?.message || errorMessage;
      }
      
      console.error("Final error message:", errorMessage);
      return res.status(502).json({ message: errorMessage });
    }

    // Extract text from Gemini response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Gemini raw response (first 500 chars):", text.substring(0, 500));

    if (!text) {
      console.error("No text content in Gemini response. Full response:", JSON.stringify(data, null, 2));
      return res.status(502).json({ message: "No response from AI model - PDF may not have been processed correctly" });
    }

    let parsed;
    try {
      // Try multiple cleaning patterns for different response formats
      let cleanedText = text;
      
      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      
      // Remove any trailing/leading whitespace
      cleanedText = cleanedText.trim();
      
      // If the response looks like an error message, return it
      if (cleanedText.toLowerCase().includes("error") || cleanedText.toLowerCase().includes("unable")) {
        console.error("AI response indicates error:", cleanedText.substring(0, 200));
        return res.status(502).json({ 
          error: "AI analysis failed",
          message: cleanedText.substring(0, 200)
        });
      }
      
      console.log("Attempting to parse cleaned text (first 200 chars):", cleanedText.substring(0, 200));
      parsed = JSON.parse(cleanedText);
      
      // Validate required fields
      if (!parsed.name || parsed.atsScore === undefined) {
        throw new Error("Missing required fields: name, atsScore");
      }
      
      console.log("✅ Successfully parsed AI response");
      console.log("Recommended jobs:", parsed.recommendedJobs?.length || 0);
      
    } catch (parseErr) {
      console.error("❌ JSON Parse Error:", parseErr.message);
      console.error("Full raw text received:", text);
      console.error("Cleaned text would have been:", text.replace(/```json\n?|```\n?/g, "").trim().substring(0, 500));
      return res.status(502).json({ 
        error: "Could not parse AI response - PDF parsing may have failed",
        details: parseErr.message,
        received: text.substring(0, 300)
      });
    }

    res.json(parsed);

  } catch (err) {
    console.error("=== ROUTE ERROR ===", err);
    next(err);
  }
});

function buildPrompt(jobListText) {
  return `You are an expert ATS resume analyzer and career counselor.

Analyze the resume above and return a JSON object (NO markdown, no backticks, just raw JSON) with exactly these fields:

{
  "name": "Candidate's name",
  "atsScore": <number 0-100>,
  "summary": "2-3 sentence professional summary of the candidate",
  "skills": ["skill1", "skill2"],
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "experienceLevel": "Fresher | Junior | Mid-level | Senior",
  "recommendedJobs": [
    {
      "jobId": "<ID from list below>",
      "title": "<job title>",
      "company": "<company>",
      "matchScore": <number 0-100>,
      "reason": "Why this job matches the candidate"
    }
  ]
}

Available jobs to recommend from (pick top matches only, max 5):
${jobListText}

Base recommendations on skill overlap, eligibility match, and experience level.
ATS score should reflect formatting quality, keyword density, clarity, and completeness.`;
}

module.exports = router;
