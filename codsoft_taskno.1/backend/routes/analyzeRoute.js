const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const authMiddleware = require("../middleware/authMiddleware");

// POST /api/analyze-resume
// Body: { base64: "...", mimeType: "application/pdf", jobs: [...] }
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { base64, mimeType, jobs } = req.body;

    if (!base64 || !mimeType) {
      return res.status(400).json({ message: "base64 and mimeType are required" });
    }

    // Only PDF is natively supported by Claude as a document block.
    // For DOCX we send it as a base64 image workaround isn't possible,
    // so we fall back to telling Claude it's a PDF (user should upload PDF ideally).
    const supportedMime = mimeType === "application/pdf" ? "application/pdf" : null;

    const jobListText = Array.isArray(jobs) && jobs.length > 0
      ? jobs.map((j, i) =>
          `${i + 1}. ID: ${j._id} | Title: ${j.title} | Company: ${j.company} | Location: ${j.location} | Skills: ${(j.skills || []).join(", ")} | Eligibility: ${j.eligibility || "N/A"}`
        ).join("\n")
      : "No jobs available currently.";

    let messages;

    if (supportedMime === "application/pdf") {
      // Send as document block (Claude natively reads PDFs)
      messages = [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 }
            },
            {
              type: "text",
              text: buildPrompt(jobListText)
            }
          ]
        }
      ];
    } else {
      // For DOCX: Claude can't read binary DOCX, so ask user to convert.
      // We still attempt with a text-only prompt and note the limitation.
      return res.status(400).json({
        message: "Please upload a PDF file. DOCX format is not supported for AI analysis yet."
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1500,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", data);
      return res.status(502).json({ message: data.error?.message || "AI analysis failed" });
    }

    const text = data.content?.map(b => b.text || "").join("") || "";

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { error: "Could not parse AI response.", raw: text };
    }

    res.json(parsed);

  } catch (err) {
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
