import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml
from dotenv import find_dotenv, load_dotenv
from crewai import Agent, Crew, LLM, Process, Task

# Load environment variables (.env in core or parent directories)
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv(find_dotenv(usecwd=True))

# Configuration file paths relative to this file
BASE_DIR = Path(__file__).resolve().parent
AGENTS_CONFIG_FILE = BASE_DIR / "agents" / "agents.yml"
TASKS_CONFIG_FILE = BASE_DIR / "tasks" / "tasks.yml"


def load_yaml(file_path: Path) -> dict:
    """Safely load and parse a YAML configuration file."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = yaml.safe_load(f)
        return content if isinstance(content, dict) else {}


def get_llm(model: Optional[str] = None) -> Optional[LLM]:
    """Resolve the LLM instance following the project's Gemini conventions."""
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        chosen_model = model or os.getenv("GEMINI_MODEL", "gemini/gemini-3.5-flash-lite")
        return LLM(model=chosen_model, api_key=api_key)
    if os.getenv("OPENAI_API_KEY"):
        return LLM(model=model or "gpt-4o-mini")
    return None


class BevinCrew:
    """CrewAI orchestration system for the Bevin developer assistant."""

    def __init__(self, llm: Optional[LLM] = None) -> None:
        self.llm = llm or get_llm()
        self.agents_config = load_yaml(AGENTS_CONFIG_FILE)
        self.tasks_config = load_yaml(TASKS_CONFIG_FILE)

        self.agents: Dict[str, Agent] = self._create_agents()
        self.tasks: List[Task] = self._create_tasks()
        self.crew: Crew = self._create_crew()

    def _create_agents(self) -> Dict[str, Agent]:
        """Instantiate agents from the YAML configuration."""
        agents = {}
        for key, cfg in self.agents_config.items():
            kwargs: Dict[str, Any] = {
                "role": cfg.get("role", ""),
                "goal": cfg.get("goal", ""),
                "backstory": cfg.get("backstory", ""),
            }
            if self.llm:
                kwargs["llm"] = self.llm
            agents[key] = Agent(**kwargs)
        return agents

    def _create_tasks(self) -> List[Task]:
        """Instantiate tasks from the YAML configuration and assign respective agents."""
        tasks = []
        for key, cfg in self.tasks_config.items():
            agent_key = cfg.get("agent")
            if not agent_key or agent_key not in self.agents:
                raise ValueError(
                    f"Task '{key}' references invalid agent '{agent_key}'. "
                    f"Available agents: {list(self.agents.keys())}"
                )
            task = Task(
                description=cfg.get("description", ""),
                expected_output=cfg.get("expected_output", ""),
                agent=self.agents[agent_key],
            )
            tasks.append(task)
        return tasks

    def _create_crew(self) -> Crew:
        """Initialize and configure the sequential Crew."""
        return Crew(
            agents=list(self.agents.values()),
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )

    def kickoff(self, inputs: Optional[Dict[str, Any]] = None) -> Any:
        """Kick off the sequential workflow."""
        return self.crew.kickoff(inputs=inputs)


def create_crew(llm: Optional[LLM] = None) -> Crew:
    """Factory helper to build and return the Crew instance."""
    system = BevinCrew(llm=llm)
    return system.crew


def kickoff(inputs: Optional[Dict[str, Any]] = None) -> Any:
    """Convenience entry point to run the crew workflow."""
    system = BevinCrew()
    return system.kickoff(inputs=inputs)


# Instantiate default crew instance when credentials are available
try:
    crew_instance = BevinCrew()
    crew = crew_instance.crew
except Exception:
    crew_instance = None
    crew = None

if __name__ == "__main__":
    if not os.getenv("GEMINI_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print(
            "Missing API Key: Set GEMINI_API_KEY in core/.env before running."
        )
    else:
        sample_input = {
            "topic": "How to implement efficient caching in a Node.js microservice"
        }
        print("Starting Bevin Crew with input topic:", sample_input["topic"])
        result = kickoff(inputs=sample_input)
        print("\n--- Kickoff Result ---")
        print(result)
