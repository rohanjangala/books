import os
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential

endpoint = "https://models.github.ai/inference"
github_api_key = os.environ.get("GITHUB_API_KEY")

client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(github_api_key),
)

print("Testing xai/grok-3-mini...")
response = client.complete(
    messages=[SystemMessage("You are a helpful assistant."), UserMessage("Write a short sentence.")],
    model="xai/grok-3-mini",
)
print("Response:", response.choices[0].message.content)

print("Testing xai/grok-3...")
try:
    response2 = client.complete(
        messages=[SystemMessage("You are a helpful assistant."), UserMessage("Write a short sentence.")],
        model="xai/grok-3",
    )
    print("Response 2:", response2.choices[0].message.content)
except Exception as e:
    print("Error:", e)
