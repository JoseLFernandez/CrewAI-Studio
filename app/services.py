"""
Service layer for business logic operations.

This module contains the business logic for crew management operations,
separated from UI and persistence concerns.
"""
from typing import List, Optional, Dict, Any, Deque, Set, Tuple
from collections import deque, defaultdict
import logging
from datetime import datetime
from crewai import Crew, Agent, Task, Process

from models import CrewModel, AgentModel, TaskModel, CrewProcess
from repositories import CrewRepository, AgentRepository, TaskRepository
from state_context import StateContext
from utils import rnd_id
from llms import create_llm


class CrewService:
    """Service for crew-related business operations."""
    
    def __init__(self, 
                 crew_repo: CrewRepository,
                 agent_repo: AgentRepository, 
                 task_repo: TaskRepository,
                 state_context: StateContext):
        self.crew_repo = crew_repo
        self.agent_repo = agent_repo
        self.task_repo = task_repo
        self.state = state_context

    def create_crew(self, name: Optional[str] = None) -> CrewModel:
        """Create a new crew with default values."""
        crew = CrewModel(
            id="C_" + rnd_id(),
            name=name or "Crew 1"
        )
        return self.crew_repo.save(crew)

    def update_crew(self, crew: CrewModel) -> CrewModel:
        """Update an existing crew."""
        return self.crew_repo.save(crew)

    def delete_crew(self, crew_id: str) -> bool:
        """Delete a crew."""
        return self.crew_repo.delete(crew_id)

    def get_crew(self, crew_id: str) -> Optional[CrewModel]:
        """Get a crew by ID."""
        return self.crew_repo.find_by_id(crew_id)

    def get_all_crews(self) -> List[CrewModel]:
        """Get all crews."""
        return self.crew_repo.find_all()

    def validate_crew(self, crew: CrewModel) -> List[str]:
        """Validate a crew and return list of errors."""
        return crew.get_validation_errors()

    def convert_to_crewai(self, crew: CrewModel) -> Crew:
        """Convert domain model to CrewAI Crew object."""
        crewai_agents = [self._convert_agent_to_crewai(agent) for agent in crew.agents]
        crewai_tasks = self._create_tasks_with_dependencies(crew.tasks)
        
        # Get knowledge sources and persist filtered IDs if any were invalid
        knowledge_sources, valid_ids = self._resolve_knowledge_sources(crew.knowledge_source_ids)
        if valid_ids is not None and valid_ids != crew.knowledge_source_ids:
            crew.knowledge_source_ids = valid_ids
            try:
                self.crew_repo.save(crew)
            except Exception:
                pass
        
        crew_kwargs = {
            'agents': crewai_agents,
            'tasks': crewai_tasks,
            'cache': crew.cache,
            'process': crew.process.value,
            'max_rpm': crew.max_rpm,
            'verbose': crew.verbose,
            'memory': crew.memory,
            'planning': crew.planning,
            'knowledge_sources': knowledge_sources if knowledge_sources else None
        }

        # Add manager configuration for hierarchical process
        if crew.process == CrewProcess.HIERARCHICAL:
            if crew.manager_llm:
                crew_kwargs['manager_llm'] = create_llm(crew.manager_llm)
            elif crew.manager_agent:
                crew_kwargs['manager_agent'] = self._convert_agent_to_crewai(crew.manager_agent)

        return Crew(**crew_kwargs)

    def _convert_agent_to_crewai(self, agent: AgentModel) -> Agent:
        """Convert AgentModel to CrewAI Agent."""
        llm = create_llm(agent.llm_provider_model, temperature=agent.temperature)
        tools = [tool.create_tool() for tool in agent.tools]
        
        # Get knowledge sources for agent and persist filtered IDs if needed
        knowledge_sources, valid_ids = self._resolve_knowledge_sources(agent.knowledge_source_ids)
        if valid_ids is not None and valid_ids != agent.knowledge_source_ids:
            agent.knowledge_source_ids = valid_ids
            try:
                self.agent_repo.save(agent)
            except Exception:
                pass
        
        return Agent(
            role=agent.role,
            goal=agent.goal,
            backstory=agent.backstory,
            llm=llm,
            tools=tools,
            verbose=agent.verbose,
            allow_delegation=agent.allow_delegation,
            max_iter=agent.max_iter,
            knowledge_sources=knowledge_sources if knowledge_sources else None
        )

    def _create_tasks_with_dependencies(self, tasks: List[TaskModel]) -> List[Task]:
        """Create CrewAI tasks while resolving dependencies using topological sort.

        - Builds a dependency graph from both async and sync context IDs.
        - Uses Kahn's algorithm with stable ordering to resolve tasks.
        - Detects cycles and logs a warning; tasks involved in cycles are created
          without context to avoid runtime errors (skip context cleanly).
        """
        logger = logging.getLogger(__name__)

        # Index tasks by id and preserve original order for stability
        id_to_task: Dict[str, TaskModel] = {t.id: t for t in tasks}
        order_index: Dict[str, int] = {t.id: i for i, t in enumerate(tasks)}

        # Build graph: for dep -> task edges, compute indegrees
        graph: Dict[str, List[str]] = defaultdict(list)
        indegree: Dict[str, int] = {t.id: 0 for t in tasks}

        def get_deps(t: TaskModel) -> List[str]:
            deps = []
            if t.context_from_async_tasks_ids:
                deps.extend(t.context_from_async_tasks_ids)
            if t.context_from_sync_tasks_ids:
                deps.extend(t.context_from_sync_tasks_ids)
            return deps

        # Populate graph and indegree; ignore dangling deps with a warning
        for t in tasks:
            for dep_id in get_deps(t):
                if dep_id in id_to_task:
                    graph[dep_id].append(t.id)
                    indegree[t.id] += 1
                else:
                    logger.warning(
                        "Task %s depends on missing task %s; ignoring this dependency.",
                        t.id,
                        dep_id,
                    )

        # Kahn's algorithm with stable queue ordering
        queue: Deque[str] = deque(sorted([tid for tid, deg in indegree.items() if deg == 0], key=lambda x: order_index[x]))
        created: Dict[str, Task] = {}
        resolved_order: List[str] = []

        while queue:
            tid = queue.popleft()
            t = id_to_task[tid]
            # Build context from already created tasks (deps resolved earlier)
            deps_ids = get_deps(t)
            context_tasks: List[Task] = [created[d] for d in deps_ids if d in created]
            created[tid] = self._convert_task_to_crewai(t, context_tasks)
            resolved_order.append(tid)

            for nxt in sorted(graph.get(tid, []), key=lambda x: order_index[x]):
                indegree[nxt] -= 1
                if indegree[nxt] == 0:
                    queue.append(nxt)

        # Detect cycles: tasks not in resolved_order
        if len(resolved_order) != len(tasks):
            cyclic_ids = [tid for tid in indegree.keys() if tid not in resolved_order]
            logger.warning(
                "Detected circular dependencies involving tasks: %s. "
                "Creating these tasks without context.",
                ", ".join(cyclic_ids),
            )
            for tid in cyclic_ids:
                if tid not in created:
                    try:
                        created[tid] = self._convert_task_to_crewai(id_to_task[tid], [])
                    except Exception as ex:
                        logger.error("Failed to create task %s without context: %s", tid, ex)

        # Return tasks in original order, skipping any that failed to create
        result: List[Task] = []
        for t in tasks:
            ct = created.get(t.id)
            if ct is not None:
                result.append(ct)
        return result

    def _convert_task_to_crewai(self, task: TaskModel, context_tasks: List[Task]) -> Task:
        """Convert TaskModel to CrewAI Task."""
        if not task.agent:
            raise ValueError(f"Task {task.description} has no agent assigned")
        
        crewai_agent = self._convert_agent_to_crewai(task.agent)
        
        task_kwargs = {
            'description': task.description,
            'expected_output': task.expected_output,
            'async_execution': task.async_execution,
            'agent': crewai_agent
        }
        
        if context_tasks:
            task_kwargs['context'] = context_tasks
            
        return Task(**task_kwargs)

    def _get_knowledge_sources(self, knowledge_source_ids: List[str]) -> List[Any]:
        """Deprecated: use _resolve_knowledge_sources to also receive filtered IDs."""
        sources, _ = self._resolve_knowledge_sources(knowledge_source_ids)
        return sources

    def _resolve_knowledge_sources(self, knowledge_source_ids: List[str]) -> Tuple[List[Any], Optional[List[str]]]:
        """Resolve knowledge sources from state, returning the list and valid IDs.

        Returns (sources, valid_ids). valid_ids is None when no state is available
        and therefore no filtering was applied. This keeps behavior aligned with
        legacy MyCrew which filters out missing IDs and persists the cleaned list.
        """
        logger = logging.getLogger(__name__)
        if not knowledge_source_ids:
            return [], []
        if not self.state.has('knowledge_sources'):
            logger.debug("No knowledge_sources in state; skipping knowledge source binding.")
            return [], None

        knowledge_sources: List[Any] = []
        all_sources = self.state.get('knowledge_sources', []) or []
        id_set = set(knowledge_source_ids)
        available_ids = {ks.id for ks in all_sources}
        missing = id_set - available_ids
        if missing:
            logger.warning("Some knowledge source ids not found and will be skipped: %s", ", ".join(sorted(missing)))

        valid_ids: List[str] = []
        for ks in all_sources:
            if ks.id in id_set:
                try:
                    knowledge_sources.append(ks.get_crewai_knowledge_source())
                    valid_ids.append(ks.id)
                except Exception as ex:
                    logger.error("Failed to load knowledge source %s: %s", ks.id, ex)
        return knowledge_sources, valid_ids


class AgentService:
    """Service for agent-related business operations."""
    
    def __init__(self, agent_repo: AgentRepository):
        self.agent_repo = agent_repo

    def create_agent(self, role: Optional[str] = None) -> AgentModel:
        """Create a new agent with default values."""
        agent = AgentModel(
            id="A_" + rnd_id(),
            role=role or "Senior Researcher",
            backstory="Driven by curiosity, you're at the forefront of innovation, eager to explore and share knowledge that could change the world.",
            goal="Uncover groundbreaking technologies in AI"
        )
        return self.agent_repo.save(agent)

    def update_agent(self, agent: AgentModel) -> AgentModel:
        """Update an existing agent."""
        return self.agent_repo.save(agent)

    def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent."""
        return self.agent_repo.delete(agent_id)

    def get_agent(self, agent_id: str) -> Optional[AgentModel]:
        """Get an agent by ID."""
        return self.agent_repo.find_by_id(agent_id)

    def get_all_agents(self) -> List[AgentModel]:
        """Get all agents."""
        return self.agent_repo.find_all()


class TaskService:
    """Service for task-related business operations."""
    
    def __init__(self, task_repo: TaskRepository):
        self.task_repo = task_repo

    def create_task(self, description: Optional[str] = None, agent: Optional[AgentModel] = None) -> TaskModel:
        """Create a new task with default values."""
        task = TaskModel(
            id="T_" + rnd_id(),
            description=description or "Identify the next big trend in AI. Focus on identifying pros and cons and the overall narrative.",
            expected_output="A comprehensive 3 paragraphs long report on the latest AI trends.",
            agent=agent
        )
        return self.task_repo.save(task)

    def update_task(self, task: TaskModel) -> TaskModel:
        """Update an existing task."""
        return self.task_repo.save(task)

    def delete_task(self, task_id: str) -> bool:
        """Delete a task."""
        return self.task_repo.delete(task_id)

    def get_task(self, task_id: str) -> Optional[TaskModel]:
        """Get a task by ID."""
        return self.task_repo.find_by_id(task_id)

    def get_all_tasks(self) -> List[TaskModel]:
        """Get all tasks."""
        return self.task_repo.find_all()
