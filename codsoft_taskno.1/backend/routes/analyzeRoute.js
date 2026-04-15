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
        maxOutputTokens: 1500
      }
    };

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return res.status(500).json({ message: "API key not configured" });
    }

    // Using Gemini 2.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta2/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log("Calling Gemini API with 2.5-flash model...");
    console.log("URL:", url.substring(0, 80) + "...[key hidden]");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    console.log("Gemini response status:", response.status);

    const data = await response.json();
    console.log("Gemini response body:", JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      console.error("Gemini API error:");
      console.error("Status:", response.status);
      console.error("Error details:", JSON.stringify(data, null, 2));
      
      // Better error message based on status code
      let errorMessage = "AI analysis failed";
      if (response.status === 400) {
        errorMessage = "Invalid request format: " + (data.error?.message || "Check request body");
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = "API key issue: Key may be invalid, expired, or disabled. Please regenerate your API key.";
      } else if (response.status === 404) {
        errorMessage = "Model not found: gemini-2.5-flash may not be available yet";
      } else {
        errorMessage = data.error?.message || errorMessage;
      }
      
      console.error("Final error message:", errorMessage);
      return res.status(502).json({ message: errorMessage });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Gemini text preview:", text.slice(0, 100));

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { error: "Could not parse AI response.", raw: text };
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
