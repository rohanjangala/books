from fastapi import FastAPI, Request  # type: ignore
from fastapi.responses import StreamingResponse, PlainTextResponse, JSONResponse  # type: ignore
from openai import OpenAI  # type: ignore
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
import os
import random
import json

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
    model="openai/gpt-4.1",
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

@app.post("/api/pro/topics")
async def pro_topics(request: Request):
    client = get_azure_client()

    body = await request.json()
    books = body.get("books", [])

    # Build a summary of the user's reading history for the AI
    book_list = "\n".join([f"- {b.get('title', '')} by {b.get('author', '')}" for b in books[:50]])

    system_prompt = """You are a long-term enthusiast and optimist. 
    You are tasked with coming up five unique topics based on a reader's Goodreads library. 
    The five topics you suggest must be useful for remaining of twenty-first century for that particular user. 
    The current year is 2026. You inspect the current trends and future prediction to manifest surreal topics.
    
    You are not a corporate bot or a non-fiction extremist. You read the user's Goodreads data fresh and recommend accordingly.
    User's data is your only point of concern. Recommend the best topics for him/her: be it sci-fi, philosophy, fantasy, or even rom-com.
    Give topic names in 2-3 words max.
    Give your output with the format ['topic1', 'topic2', 'topic3', 'topic4', 'topic5'] and nothing else."""

    user_prompt = f"""Here is my Goodreads reading history:

{book_list}

Based on my reading patterns and interests, come up with five unique topics that would be useful for me in the remaining of the twenty-first century."""

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

@app.post("/api/pro/books")
async def pro_books(request: Request):
    client = get_azure_client()
    
    body = await request.json()
    books = body.get("books", [])
    topics = body.get("topics", [])

    # Build a summary of the user's reading history to avoid duplicates
    # Limit to 150 to stay within reasonable token limits while covering most users
    book_list = "\n".join([f"- {b.get('title', '')} by {b.get('author', '')}" for b in books[:150]])
    topics_list = ", ".join(topics)

    system_prompt="You are an expert book recommender."
    system_prompt += "You have vast experience in the world of books across all genres, and also the recommended websites to read."
    system_prompt += "For a given list of topics, you can quickly discern the appropriate books to recommend and provide their reading/purchase links."
    user_prompt = f"""
    For each of the following topics: {topics_list}
    
    1) Understand the topic sensibly well to first give a 1-2 line description of the topic.
    2) Then tell the reader three books one should read about the topic in a numbered-list format. Include the name of each book, a 1-line description, and the link to the book. Don't add anything else.
    
    Here is the reader's existing reading history:
    {book_list}
    
    ##Important: 
        *CRITICAL: DO NOT recommend ANY book that is already on the reader's existing reading history list provided above.
        *Make sure to give the link for each book. Verify this link before recommending. The books and their links have to be real and legit. 
        *Make a note at the end of each topic's response: These recommendations are based on well-established books in the field. If a link becomes outdated or inaccessible, searching the book title on the respective platform should yield the correct page.
        *You MUST return your entire response as a single valid JSON object. 
        *The keys of this JSON object MUST be exactly the topic names provided above.
        *The value for each key MUST be a SINGLE markdown formatted string containing BOTH the 1-2 line description AND the numbered list of 3 books and the note. Do NOT split the description and the books into separate keys! Every topic MUST have EXACTLY one key in the JSON object.
        *Do NOT wrap the JSON in markdown code blocks like `json ... `. Just return the raw JSON string.##
    """
    
    import asyncio
    
    def fetch_books():
        return client.complete(
            messages=[SystemMessage(system_prompt),UserMessage(user_prompt)],
            temperature=0.7,
            top_p=1.0,  
            model="openai/gpt-4.1",
        )
        
    response = await asyncio.to_thread(fetch_books)
    
    content = response.choices[0].message.content
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    
    return PlainTextResponse(content=content)