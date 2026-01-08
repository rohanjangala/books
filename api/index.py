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

@app.get("/api", response_class=PlainTextResponse)
def topic():
    client = OpenAI(base_url=endpoint, api_key=github_api_key)
    system_prompt = """You are a long-term entrepreneur and enthusiast. 
    You are tasked with coming up with a unique topics that is useful for remaining of twenty-first century. 
    The current year is 2026. You inspect the current trends and future prediction to manifest surreal topics.
    Only give one topic name, in two to three words.
    Give your output as just the topic string and nothing else."""
    user_prompt = """
    Come up with a unique topic that is useful for remaining of twenty-first century. 
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
    response = client.chat.completions.create(model="openai/gpt-4.1-nano", messages=prompt, stream=False)
    topic = response.choices[0].message.content
    return topic

@app.get("/api/response")
def idea(topic: str):
    system_prompt="You are an expert non-fiction book recommender."
    system_prompt += "You have vast experience in the world of non-fiction books, and also the recommended websites to read."
    system_prompt += "For a given topic(s), you can quickly discern the appropriate books to recommend and provide their reading/purchase links."
    user_prompt = f"""
    1) Start with 'Five books you should read about {topic}:' and then give a 1-2 lined simple description of the {topic}. Then add "Each book has been verified for legitimacy, and the links provided direct to reputable sources for reading or purchase." Don't put anything else.
    2) Then tell the reader about five books one should read about the {topic} along with a 2-3 description for each book followed by its link. Don't add anything else.
    ##Important: 
        *Give the list formatted with numbered-list, appropriate bolding. 
        *Verify the link before recommending. The books and their links have to be real and legit. 
        *Make a note at the end: If a link becomes outdated or inaccessible, searching the book title on the respective platform should yield the correct page.*
        *Don't add further unnecessary text or notes.##

    """

    client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(github_api_key),
    )
    
    response = client.complete(
    messages=[
        SystemMessage(system_prompt),
        UserMessage(user_prompt),
    ],
    temperature=1.0,
    top_p=1.0,  
    model="xai/grok-3",
    stream=True,
    )

    def event_stream():
        for chunk in response:
            # Check if choices exist and are not empty
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