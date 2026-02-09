from fastapi import FastAPI  # type: ignore
from fastapi.responses import StreamingResponse, PlainTextResponse, JSONResponse  # type: ignore
from openai import OpenAI  # type: ignore
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
import os
import random

app = FastAPI()
endpoint = "https://models.github.ai/inference"
github_api_key = os.environ.get("GITHUB_API_KEY")
model = "xai/grok-3-mini"
_azure_client = None

@app.get("/api/topics")
def random_topics():
    topics_file = os.path.join(os.path.dirname(__file__), "..", "topics.txt")
    try:
        with open(topics_file, "r") as f:
            all_topics = [line.strip() for line in f if line.strip()]        
        selected = random.sample(all_topics, min(5, len(all_topics)))
        return JSONResponse(content=selected)
    except FileNotFoundError:
        return JSONResponse(content=[
            "AI Memory Stewardship", 
            "Climate-Adaptive Cities", 
            "Longevity Engineering", 
            "Decentralized Trust", 
            "Space Manufacturing"
        ])

def get_azure_client():
    global _azure_client
    if _azure_client is None:
        if not github_api_key:
            raise ValueError("GITHUB_API_KEY environment variable is not set")
        _azure_client = ChatCompletionsClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(github_api_key),
        )
    return _azure_client

@app.get("/api/books")
def idea(topic: str):
    client = get_azure_client()
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