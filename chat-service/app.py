import os
import sys

from crewai import Agent, Crew, LLM, Process, Task
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Bevin Chat Service")

llm = LLM(
    model="gemini/gemini-3.5-flash-lite",
    api_key=os.getenv("GEMINI_API_KEY"),
)


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    context = "\n".join(
        f"{m.get('role')}: {m.get('text')}" for m in req.history[-10:]
    )
    prompt = (
        f"Conversation so far:\n{context}\n\nUser: {req.message}"
        if context
        else req.message
    )

    agent = Agent(
        role="Bevin Assistant",
        goal="Answer the user's questions helpfully and concisely",
        backstory="You are Bevin, a friendly AI assistant embedded in a developer dashboard.",
        llm=llm,
        allow_delegation=False,
    )
    task = Task(
        description=prompt,
        agent=agent,
        expected_output="A clear, helpful reply to the user's message.",
    )
    crew = Crew(
        agents=[agent], tasks=[task], process=Process.sequential, stream=True
    )

    def generate():
        try:
            streaming = crew.kickoff()
            for chunk in streaming:
                if chunk.content:
                    yield chunk.content
        except Exception as exc:  # noqa: BLE001
            print(f"chat stream error: {exc}", file=sys.stderr, flush=True)

    return StreamingResponse(
        generate(), media_type="text/plain; charset=utf-8"
    )
