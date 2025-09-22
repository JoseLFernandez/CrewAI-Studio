"""
Core domain models for CrewAI Studio.

This module contains the pure data models without UI concerns.
All business logic and validation should be here.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
from crewai import Process

class CrewProcess(Enum):
    """Enumeration for crew process types."""
    SEQUENTIAL = Process.sequential
    HIERARCHICAL = Process.hierarchical


@dataclass
class CrewModel:
    """Pure data model for a crew."""
    id: str
    name: str
    agents: List['AgentModel'] = field(default_factory=list)
    tasks: List['TaskModel'] = field(default_factory=list)
    process: CrewProcess = CrewProcess.SEQUENTIAL
    verbose: bool = True
    manager_llm: Optional[str] = None
    manager_agent: Optional['AgentModel'] = None
    memory: bool = False
    cache: bool = True
    max_rpm: int = 1000
    planning: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    knowledge_source_ids: List[str] = field(default_factory=list)

    def is_valid(self) -> bool:
        """Validate the crew configuration."""
        if not self.agents:
            return False
        if not self.tasks:
            return False
        if not all(agent.is_valid() for agent in self.agents):
            return False
        if not all(task.is_valid() for task in self.tasks):
            return False
        if self.process == CrewProcess.HIERARCHICAL and not (self.manager_llm or self.manager_agent):
            return False
        return True

    def get_validation_errors(self) -> List[str]:
        """Get list of validation errors."""
        errors = []
        if not self.agents:
            errors.append(f"Crew {self.name} has no agents")
        if not self.tasks:
            errors.append(f"Crew {self.name} has no tasks")
        
        for agent in self.agents:
            if not agent.is_valid():
                errors.extend(agent.get_validation_errors())
        
        for task in self.tasks:
            if not task.is_valid():
                errors.extend(task.get_validation_errors())
        
        if self.process == CrewProcess.HIERARCHICAL and not (self.manager_llm or self.manager_agent):
            errors.append(f"Crew {self.name} has no manager agent or manager llm set for hierarchical process")
        
        return errors


@dataclass
class AgentModel:
    """Pure data model for an agent."""
    id: str
    role: str
    backstory: str
    goal: str
    temperature: float = 0.1
    allow_delegation: bool = False
    verbose: bool = True
    cache: bool = True
    llm_provider_model: str = ""
    max_iter: int = 25
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    tools: List[Any] = field(default_factory=list)  # Tool objects
    knowledge_source_ids: List[str] = field(default_factory=list)

    def is_valid(self) -> bool:
        """Validate the agent configuration."""
        return bool(self.role and self.backstory and self.goal and self.llm_provider_model)

    def get_validation_errors(self) -> List[str]:
        """Get list of validation errors."""
        errors = []
        if not self.role:
            errors.append("Agent role is required")
        if not self.backstory:
            errors.append("Agent backstory is required")
        if not self.goal:
            errors.append("Agent goal is required")
        if not self.llm_provider_model:
            errors.append("Agent LLM provider/model is required")
        return errors


@dataclass
class TaskModel:
    """Pure data model for a task."""
    id: str
    description: str
    expected_output: str
    agent: Optional[AgentModel] = None
    async_execution: bool = False
    context_from_async_tasks_ids: Optional[List[str]] = None
    context_from_sync_tasks_ids: Optional[List[str]] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def is_valid(self) -> bool:
        """Validate the task configuration."""
        return bool(self.description and self.expected_output and self.agent and self.agent.is_valid())

    def get_validation_errors(self) -> List[str]:
        """Get list of validation errors."""
        errors = []
        if not self.description:
            errors.append("Task description is required")
        if not self.expected_output:
            errors.append("Task expected output is required")
        if not self.agent:
            errors.append(f"Task {self.description} has no agent")
        elif not self.agent.is_valid():
            errors.append(f"Task {self.description} has invalid agent")
        return errors


@dataclass
class ToolModel:
    """Pure data model for a tool."""
    id: str
    name: str
    description: str
    tool_class: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def is_valid(self) -> bool:
        """Validate the tool configuration."""
        return bool(self.name and self.description and self.tool_class)


@dataclass
class KnowledgeSourceModel:
    """Pure data model for a knowledge source."""
    id: str
    name: str
    source_type: str
    config: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def is_valid(self) -> bool:
        """Validate the knowledge source configuration."""
        return bool(self.name and self.source_type)
