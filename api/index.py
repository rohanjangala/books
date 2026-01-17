from fastapi import FastAPI  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from fastapi.responses import PlainTextResponse  # type: ignore
from openai import OpenAI  # type: ignore
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
import os

app = FastAPI()
endpoint = "https://models.github.ai/inference"
github_api_key = os.environ.get("GITHUB_API_KEY")
model = "openai/gpt-4.1-nano"

azure_client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(github_api_key),
)

openai_client = OpenAI(base_url=endpoint, api_key=github_api_key)

@app.get("/api/topics", response_class=PlainTextResponse)
def topic():
    # client = OpenAI(base_url=endpoint, api_key=github_api_key)
    client = azure_client

    system_prompt = """You are a long-term entrepreneur and enthusiast. 
    You are tasked with coming up with unique topics that is useful for remaining of twenty-first century. 
    The current year is 2026. You inspect the current trends and future prediction to manifest surreal topics.
    Only give as many topic names as asked by the user, each topic in two to three words.
    Give your output with the format ['topic1', 'topic2', 'topic3', 'topic4', 'topic5'] and nothing else."""
    user_prompt = """
    Come up with five unique topics that is useful for remaining of twenty-first century. 
    """
    prompt = [
        {
        "role": "system", 
        "content": system_prompt
        },
        {
        "role": "user", 
        "content": user_prompt
        }
    ]
    response = client.complete(
        messages=[
            SystemMessage(system_prompt),
            UserMessage(user_prompt),
        ],
        temperature=1.0,
        top_p=1.0,
        model="openai/gpt-4.1-nano"
    )
    topic = response.choices[0].message.content
    return topic

@app.get("/api/books")
def idea(topic: str):
    system_prompt="You are an expert non-fiction book recommender."
    system_prompt += "You have vast experience in the world of non-fiction books, and also the recommended websites to read."
    system_prompt += "For a given topic(s), you can quickly discern the appropriate books to recommend and provide their reading/purchase links."
    user_prompt = f"""
    1) Understand the {topic} sensibly well to first give a 1-2 line description of the topic.
    2) Then tell the reader three books one should read about the {topic} in a numbered-list format. Include the name of each book, a 1-line description, and the link to the book. Don't add anything else.
    ##Important: 
        *Make sure to give the link for each book. Verify this link before recommending. The books and their links have to be real and legit. 
        *Make a note at the end: These recommendations are based on well-established books in the field of {topic}. If a link becomes outdated or inaccessible, searching the book title on the respective platform should yield the correct page.
        *Don't add further unnecessary text or notes.##

    """

    client = azure_client
    response = client.complete(
    messages=[SystemMessage(system_prompt),UserMessage(user_prompt)],
    temperature=0.7,
    top_p=1.0,  
    model="xai/grok-3-mini",
    stream=True,
    )

    def event_stream():
        for chunk in response:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if delta and hasattr(delta, 'content'):
                    text = delta.content
                    if text:
                        lines = text.split("\n")
                        for line in lines:
                            yield f"data: {line}\n"
                        yield "\n"
        
    return StreamingResponse(event_stream(), media_type="text/event-stream")