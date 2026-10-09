import json
from typing import Any

from config.settings import settings
from services.groq_service import get_groq_client


# =========================================================
# JSON EXTRACTION
# =========================================================

def _extract_json(
    text: str,
) -> dict[str, Any]:

    cleaned = text.strip()

    if cleaned.startswith("```"):

        lines = cleaned.splitlines()

        if lines:
            lines = lines[1:]

        if (
            lines
            and lines[-1].strip() == "```"
        ):
            lines = lines[:-1]

        cleaned = "\n".join(lines).strip()

    try:

        return json.loads(cleaned)

    except json.JSONDecodeError as exc:

        raise ValueError(
            "Vision model returned invalid JSON."
        ) from exc


# =========================================================
# IMAGE + COMPLAINT ANALYSIS
# =========================================================

def analyze_image_against_complaint(
    complaint_text: str,
    image_url: str,
) -> dict[str, Any]:

    if not complaint_text.strip():

        raise ValueError(
            "Complaint text cannot be empty."
        )

    if not image_url.strip():

        raise ValueError(
            "Image URL cannot be empty."
        )

    # =====================================================
    # SYSTEM PROMPT
    # =====================================================

    system_prompt = """
You are CivicScribe's multimodal civic evidence analyst.

Analyze a citizen's complaint together with an uploaded
photographic evidence image.

Your job is to determine what is visibly present in the image
and whether that visual evidence supports the complaint.

The complaint may be written in English, Tamil, Hindi,
Tanglish, Hinglish, or another natural language.

Possible civic issues include:

- road damage
- potholes
- garbage
- waste accumulation
- drainage problems
- water leakage
- flooding
- streetlight problems
- damaged public infrastructure
- public safety hazards
- electrical infrastructure
- sanitation problems
- other public-service issues

IMPORTANT RULES:

1. Only describe things that can reasonably be observed
   in the image.

2. Never invent objects, damage, people, locations,
   accidents, or circumstances.

3. Do not assume that the image was taken at the
   location mentioned in the complaint.

4. Compare the visible evidence with the complaint text.

5. If the image supports the complaint, mark it relevant.

6. If the image is unclear or only partially supports
   the complaint, mark it possibly_relevant.

7. If the image is unrelated, mark it irrelevant.

8. Do not identify private individuals.

9. Do not infer exact location from visual appearance.

10. Do not infer official/legal priority from the image.

Return ONLY valid JSON.

Required structure:

{
    "image_description": "...",
    "detected_objects": [],
    "detected_issue": null,
    "relevance": "relevant",
    "relevance_score": 0,
    "relevance_reason": "...",
    "consistency_score": 0,
    "consistency_status": "consistent",
    "consistency_explanation": "...",
    "confidence": 0,
    "severity_score": 0,
    "severity_reason": "..."
}

Allowed relevance values:

"relevant"
"possibly_relevant"
"irrelevant"

Allowed consistency values:

"consistent"
"partially_consistent"
"inconsistent"

Scores must be between 0 and 100.

detected_objects must contain concise descriptions
of observable objects.

detected_issue should be null when no civic issue
can reasonably be identified.
"""

    # =====================================================
    # USER PROMPT
    # =====================================================

    user_prompt = f"""
Citizen complaint:

{complaint_text}

Analyze the uploaded image as evidence for this complaint.

Determine:

1. What is visible?
2. What civic issue, if any, is visible?
3. Whether the image is relevant to the complaint.
4. Whether the image is visually consistent with
   the complaint.
5. How confident you are in the visual assessment.
6. Assess the severity of the issue based on the image (0-100) and provide a reason.

Return ONLY the required JSON.
"""

    # =====================================================
    # GROQ CLIENT
    # =====================================================

    client = get_groq_client()

    # =====================================================
    # VISION REQUEST
    # =====================================================

    response = client.chat.completions.create(

        model=settings.groq_vision_model,

        temperature=0,

        response_format={
            "type": "json_object"
        },

        messages=[

            {
                "role": "system",
                "content": system_prompt,
            },

            {
                "role": "user",

                "content": [

                    {
                        "type": "text",
                        "text": user_prompt,
                    },

                    {
                        "type": "image_url",

                        "image_url": {
                            "url": image_url,
                        },
                    },
                ],
            },
        ],
    )

    # =====================================================
    # RESPONSE
    # =====================================================

    content = (
        response
        .choices[0]
        .message
        .content
        or ""
    )

    result = _extract_json(
        content
    )

    # =====================================================
    # VALIDATION
    # =====================================================

    required_fields = [

        "image_description",

        "detected_objects",

        "detected_issue",

        "relevance",

        "relevance_score",

        "relevance_reason",

        "consistency_score",

        "consistency_status",

        "consistency_explanation",

        "confidence",
        "severity_score",
        "severity_reason"
    ]

    for field in required_fields:

        if field not in result:

            raise ValueError(
                f"Vision response missing field: {field}"
            )

    # =====================================================
    # VALIDATE ENUMS
    # =====================================================

    allowed_relevance = {
        "relevant",
        "possibly_relevant",
        "irrelevant",
    }

    allowed_consistency = {
        "consistent",
        "partially_consistent",
        "inconsistent",
    }

    if result["relevance"] not in allowed_relevance:

        raise ValueError(
            "Invalid image relevance value returned by vision model."
        )

    if (
        result["consistency_status"]
        not in allowed_consistency
    ):

        raise ValueError(
            "Invalid image consistency status returned by vision model."
        )

    # =====================================================
    # VALIDATE SCORES
    # =====================================================

    try:

        relevance_score = float(
            result["relevance_score"]
        )

        consistency_score = float(
            result["consistency_score"]
        )

        confidence = float(
            result["confidence"]
        )

        severity_score = float(
            result["severity_score"]
        )

    except (
        TypeError,
        ValueError,
    ) as exc:

        raise ValueError(
            "Vision model returned invalid score values."
        ) from exc

    if not 0 <= relevance_score <= 100:

        raise ValueError(
            "Image relevance score must be between 0 and 100."
        )

    if not 0 <= consistency_score <= 100:

        raise ValueError(
            "Image consistency score must be between 0 and 100."
        )

    if not 0 <= confidence <= 100:

        raise ValueError(
            "Image confidence must be between 0 and 100."
        )

    if not 0 <= severity_score <= 100:

        raise ValueError(
            "Severity score must be between 0 and 100."
        )

    # =====================================================
    # NORMALIZE RESULT
    # =====================================================

    result["relevance_score"] = relevance_score

    result["consistency_score"] = consistency_score

    result["confidence"] = confidence

    result["severity_score"] = severity_score

    if not isinstance(
        result["detected_objects"],
        list,
    ):

        result["detected_objects"] = [
            str(result["detected_objects"])
        ]

    return result

def verify_resolution(
    complaint_text: str,
    original_image_url: str,
    resolved_image_url: str
) -> dict[str, Any]:
    system_prompt = """
You are a civic compliance verification AI. 
You will be provided with:
1. The original citizen complaint text.
2. The original image of the issue (if available).
3. The new 'resolved' image submitted by an officer.

Your task is to determine whether the visual evidence in the 'resolved' image convincingly shows that the civic issue described in the complaint has been addressed or repaired.

Return ONLY valid JSON in this exact format:
{
    "resolved": true or false,
    "confidence_score": 0-100,
    "reason": "Explain why the issue appears resolved or not, comparing the two images if applicable."
}
"""
    user_prompt = f"Complaint Text:\n{complaint_text}\n\nPlease analyze the provided images and verify if the issue is resolved."
    
    content_list = [{"type": "text", "text": user_prompt}]
    if original_image_url:
        content_list.append({"type": "image_url", "image_url": {"url": original_image_url}})
    content_list.append({"type": "image_url", "image_url": {"url": resolved_image_url}})

    client = get_groq_client()
    response = client.chat.completions.create(
        model=settings.groq_vision_model,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content_list}
        ],
    )
    
    content = response.choices[0].message.content or ""
    return _extract_json(content)