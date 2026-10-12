import os
from pathlib import Path
from typing import Any

from dotenv import find_dotenv, load_dotenv
from crewai import Agent, Crew, LLM, Process, Task
from crewai.project import CrewBase, agent, crew, task

from src.utils.models import CodeReview


# Load environment variables before resolving the LLM.
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv(find_dotenv(usecwd=True))


def get_llm() -> LLM | None:
    """Resolve the configured Gemini or OpenAI model."""
    if os.getenv("GEMINI_API_KEY"):
        return LLM(
            model=os.getenv(
                "GEMINI_MODEL",
                "gemini/gemini-3.5-flash-lite",
            ),
            api_key=os.environ["GEMINI_API_KEY"],
        )

    if os.getenv("OPENAI_API_KEY"):
        return LLM(model="gpt-4o-mini")

    return None


@CrewBase
class BevinCrew:
    """CrewAI workflow for code analysis and solution review."""

    agents_config = "agents/agents.yaml"
    tasks_config = "tasks/tasks.yaml"

    llm = get_llm()

    @agent
    def code_analyst(self) -> Agent:
        kwargs: dict[str, Any] = {
            "config": self.agents_config["code_analyst"],
            "verbose": True,
        }

        if self.llm:
            kwargs["llm"] = self.llm

        return Agent(**kwargs)

    @agent
    def solution_reviewer(self) -> Agent:
        kwargs: dict[str, Any] = {
            "config": self.agents_config["solution_reviewer"],
            "verbose": True,
        }

        if self.llm:
            kwargs["llm"] = self.llm

        return Agent(**kwargs)

    @task
    def analyze_code_inquiry(self) -> Task:
        return Task(
            config=self.tasks_config["analyze_code_inquiry"],
            agent=self.code_analyst(),
        )

    @task
    def review_code_solution(self) -> Task:
        return Task(
            config=self.tasks_config["review_code_solution"],
            agent=self.solution_reviewer(),
            context=[self.analyze_code_inquiry()],
            output_pydantic=CodeReview,
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=[
                self.code_analyst(),
                self.solution_reviewer(),
            ],
            tasks=[
                self.analyze_code_inquiry(),
                self.review_code_solution(),
            ],
            process=Process.sequential,
            verbose=True,
        )


    def kickoff(self, inputs: dict[str, Any]):
        """Run the Bevin workflow."""
        return BevinCrew().crew().kickoff(inputs=inputs)