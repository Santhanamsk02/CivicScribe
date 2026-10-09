from groq import Groq

from config.settings import settings


if not settings.groq_api_key:
    raise ValueError("GROQ_API_KEY is not configured")


client = Groq(api_key=settings.groq_api_key)


def ask_llm(prompt: str) -> str:
    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2
    )

    return response.choices[0].message.content