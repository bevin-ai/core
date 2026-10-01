import os
import sys

from crewai import Agent, Crew, LLM, Process, Task
from dotenv import load_dotenv
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Bevin Chat Service")

llm = LLM(
    model="gemini/gemini-3.5-flash-lite",
    api_key=os.getenv("GEMINI_API_KEY"),
)


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []
    first: bool = False


class FirstReply(BaseModel):
    title: str = Field(description="Session title, at most 6 words, title case")
    reply: str = Field(description="The complete answer to the user's message")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def build_agent() -> Agent:
    return Agent(
        role="Bevin Assistant",
        goal="Answer the user's questions helpfully and concisely",
        backstory="You are Bevin, a friendly AI assistant embedded in a developer dashboard.",
        llm=llm,
        allow_delegation=False,
    )


@app.post("/chat")
def chat(req: ChatRequest) -> Response:
    context = "\n".join(
        f"{m.get('role')}: {m.get('text')}" for m in req.history[-10:]
    )

    if req.first:
        prompt = (
            f"User: {req.message}\n\n"
            "This is the first message of a new conversation. Return a JSON "
            "object with 'title' (a short session title of at most 6 words) "
            "and 'reply' (your complete answer)."
        )
        task = Task(
            description=prompt,
            agent=build_agent(),
            expected_output="A JSON object with 'title' and 'reply' fields.",
            output_pydantic=FirstReply,
        )
        crew = Crew(agents=[task.agent], tasks=[task], process=Process.sequential)
        try:
            result = crew.kickoff()
            if result.pydantic is not None:
                return JSONResponse(content=result.pydantic.model_dump())
            return JSONResponse(content={"title": "", "reply": str(result.raw)})
        except Exception as exc:  # noqa: BLE001
            print(f"title/reply error: {exc}", file=sys.stderr, flush=True)
            return JSONResponse(status_code=502, content={"error": "Chat failed"})

    prompt = (
        f"Conversation so far:\n{context}\n\nUser: {req.message}"
        if context
        else req.message
    )
    agent = build_agent()
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
