"""
Concrete repository implementations.

This module provides implementations of the repository interfaces
using the existing db_utils functions.
"""
from typing import List, Optional
import db_utils
from models import CrewModel, AgentModel, TaskModel
from repositories import CrewRepository, AgentRepository, TaskRepository


class DbCrewRepository(CrewRepository[CrewModel]):
    """Database implementation of crew repository."""
    
    def save(self, entity: CrewModel) -> CrewModel:
        """Save a crew to the database."""
        # Convert to the legacy MyCrew object for now
        legacy_crew = self._convert_to_legacy(entity)
        db_utils.save_crew(legacy_crew)
        return entity
    
    def find_by_id(self, entity_id: str) -> Optional[CrewModel]:
        """Find a crew by ID."""
        legacy_crews = db_utils.load_crews()
        legacy_crew = next((c for c in legacy_crews if c.id == entity_id), None)
        if legacy_crew:
            return self._convert_from_legacy(legacy_crew)
        return None
    
    def find_all(self) -> List[CrewModel]:
        """Find all crews."""
        legacy_crews = db_utils.load_crews()
        return [self._convert_from_legacy(crew) for crew in legacy_crews]
    
    def delete(self, entity_id: str) -> bool:
        """Delete a crew by ID."""
        try:
            db_utils.delete_crew(entity_id)
            return True
        except Exception:
            return False
    
    def exists(self, entity_id: str) -> bool:
        """Check if a crew exists."""
        return self.find_by_id(entity_id) is not None
    
    def find_by_name(self, name: str) -> Optional[CrewModel]:
        """Find a crew by name."""
        crews = self.find_all()
        return next((c for c in crews if c.name == name), None)
    
    def _convert_to_legacy(self, crew: CrewModel):
        """Convert CrewModel to legacy MyCrew object."""
        # Import here to avoid circular imports
        from my_crew import MyCrew
        from crewai import Process
        
        # Convert process enum
        process = Process.sequential if crew.process.name == 'SEQUENTIAL' else Process.hierarchical
        
        # Convert agent and task models to legacy objects if needed
        legacy_agents = [self._convert_agent_to_legacy(agent) for agent in crew.agents]
        legacy_tasks = [self._convert_task_to_legacy(task) for task in crew.tasks]
        
        return MyCrew(
            id=crew.id,
            name=crew.name,
            agents=legacy_agents,
            tasks=legacy_tasks,
            process=process,
            cache=crew.cache,
            max_rpm=crew.max_rpm,
            verbose=crew.verbose,
            manager_llm=crew.manager_llm,
            manager_agent=self._convert_agent_to_legacy(crew.manager_agent) if crew.manager_agent else None,
            created_at=crew.created_at,
            memory=crew.memory,
            planning=crew.planning,
            knowledge_source_ids=crew.knowledge_source_ids
        )
    
    def _convert_from_legacy(self, legacy_crew) -> CrewModel:
        """Convert legacy MyCrew object to CrewModel."""
        from models import CrewProcess
        from crewai import Process
        
        # Convert process
        process = CrewProcess.SEQUENTIAL if legacy_crew.process == Process.sequential else CrewProcess.HIERARCHICAL
        
        # Convert agents and tasks
        agents = [self._convert_agent_from_legacy(agent) for agent in legacy_crew.agents]
        tasks = [self._convert_task_from_legacy(task) for task in legacy_crew.tasks]
        
        return CrewModel(
            id=legacy_crew.id,
            name=legacy_crew.name,
            agents=agents,
            tasks=tasks,
            process=process,
            verbose=legacy_crew.verbose,
            manager_llm=legacy_crew.manager_llm,
            manager_agent=self._convert_agent_from_legacy(legacy_crew.manager_agent) if legacy_crew.manager_agent else None,
            memory=legacy_crew.memory,
            cache=legacy_crew.cache,
            max_rpm=legacy_crew.max_rpm,
            planning=legacy_crew.planning,
            created_at=legacy_crew.created_at,
            knowledge_source_ids=legacy_crew.knowledge_source_ids
        )
    
    def _convert_agent_to_legacy(self, agent: AgentModel):
        """Convert AgentModel to legacy MyAgent object."""
        from my_agent import MyAgent
        
        return MyAgent(
            id=agent.id,
            role=agent.role,
            backstory=agent.backstory,
            goal=agent.goal,
            temperature=agent.temperature,
            allow_delegation=agent.allow_delegation,
            verbose=agent.verbose,
            cache=agent.cache,
            llm_provider_model=agent.llm_provider_model,
            max_iter=agent.max_iter,
            created_at=agent.created_at,
            tools=agent.tools,
            knowledge_source_ids=agent.knowledge_source_ids
        )
    
    def _convert_agent_from_legacy(self, legacy_agent) -> AgentModel:
        """Convert legacy MyAgent object to AgentModel."""
        return AgentModel(
            id=legacy_agent.id,
            role=legacy_agent.role,
            backstory=legacy_agent.backstory,
            goal=legacy_agent.goal,
            temperature=legacy_agent.temperature,
            allow_delegation=legacy_agent.allow_delegation,
            verbose=legacy_agent.verbose,
            cache=legacy_agent.cache,
            llm_provider_model=legacy_agent.llm_provider_model,
            max_iter=legacy_agent.max_iter,
            created_at=legacy_agent.created_at,
            tools=legacy_agent.tools,
            knowledge_source_ids=legacy_agent.knowledge_source_ids
        )
    
    def _convert_task_to_legacy(self, task: TaskModel):
        """Convert TaskModel to legacy MyTask object."""
        from my_task import MyTask
        
        return MyTask(
            id=task.id,
            description=task.description,
            expected_output=task.expected_output,
            agent=self._convert_agent_to_legacy(task.agent) if task.agent else None,
            async_execution=task.async_execution,
            created_at=task.created_at,
            context_from_async_tasks_ids=task.context_from_async_tasks_ids,
            context_from_sync_tasks_ids=task.context_from_sync_tasks_ids
        )
    
    def _convert_task_from_legacy(self, legacy_task) -> TaskModel:
        """Convert legacy MyTask object to TaskModel."""
        return TaskModel(
            id=legacy_task.id,
            description=legacy_task.description,
            expected_output=legacy_task.expected_output,
            agent=self._convert_agent_from_legacy(legacy_task.agent) if legacy_task.agent else None,
            async_execution=legacy_task.async_execution,
            created_at=legacy_task.created_at,
            context_from_async_tasks_ids=legacy_task.context_from_async_tasks_ids,
            context_from_sync_tasks_ids=legacy_task.context_from_sync_tasks_ids
        )


class DbAgentRepository(AgentRepository[AgentModel]):
    """Database implementation of agent repository."""
    
    def save(self, entity: AgentModel) -> AgentModel:
        """Save an agent to the database."""
        # Convert to legacy object for now
        from my_agent import MyAgent
        
        legacy_agent = MyAgent(
            id=entity.id,
            role=entity.role,
            backstory=entity.backstory,
            goal=entity.goal,
            temperature=entity.temperature,
            allow_delegation=entity.allow_delegation,
            verbose=entity.verbose,
            cache=entity.cache,
            llm_provider_model=entity.llm_provider_model,
            max_iter=entity.max_iter,
            created_at=entity.created_at,
            tools=entity.tools,
            knowledge_source_ids=entity.knowledge_source_ids
        )
        db_utils.save_agent(legacy_agent)
        return entity
    
    def find_by_id(self, entity_id: str) -> Optional[AgentModel]:
        """Find an agent by ID."""
        legacy_agents = db_utils.load_agents()
        legacy_agent = next((a for a in legacy_agents if a.id == entity_id), None)
        if legacy_agent:
            return self._convert_from_legacy(legacy_agent)
        return None
    
    def find_all(self) -> List[AgentModel]:
        """Find all agents."""
        legacy_agents = db_utils.load_agents()
        return [self._convert_from_legacy(agent) for agent in legacy_agents]
    
    def delete(self, entity_id: str) -> bool:
        """Delete an agent by ID."""
        try:
            db_utils.delete_agent(entity_id)
            return True
        except Exception:
            return False
    
    def exists(self, entity_id: str) -> bool:
        """Check if an agent exists."""
        return self.find_by_id(entity_id) is not None
    
    def find_by_role(self, role: str) -> Optional[AgentModel]:
        """Find an agent by role."""
        agents = self.find_all()
        return next((a for a in agents if a.role == role), None)
    
    def _convert_from_legacy(self, legacy_agent) -> AgentModel:
        """Convert legacy MyAgent object to AgentModel."""
        return AgentModel(
            id=legacy_agent.id,
            role=legacy_agent.role,
            backstory=legacy_agent.backstory,
            goal=legacy_agent.goal,
            temperature=legacy_agent.temperature,
            allow_delegation=legacy_agent.allow_delegation,
            verbose=legacy_agent.verbose,
            cache=legacy_agent.cache,
            llm_provider_model=legacy_agent.llm_provider_model,
            max_iter=legacy_agent.max_iter,
            created_at=legacy_agent.created_at,
            tools=legacy_agent.tools,
            knowledge_source_ids=legacy_agent.knowledge_source_ids
        )


class DbTaskRepository(TaskRepository[TaskModel]):
    """Database implementation of task repository."""
    
    def save(self, entity: TaskModel) -> TaskModel:
        """Save a task to the database."""
        # Convert to legacy object for now
        from my_task import MyTask
        from my_agent import MyAgent
        
        legacy_agent = None
        if entity.agent:
            legacy_agent = MyAgent(
                id=entity.agent.id,
                role=entity.agent.role,
                backstory=entity.agent.backstory,
                goal=entity.agent.goal,
                temperature=entity.agent.temperature,
                allow_delegation=entity.agent.allow_delegation,
                verbose=entity.agent.verbose,
                cache=entity.agent.cache,
                llm_provider_model=entity.agent.llm_provider_model,
                max_iter=entity.agent.max_iter,
                created_at=entity.agent.created_at,
                tools=entity.agent.tools,
                knowledge_source_ids=entity.agent.knowledge_source_ids
            )
        
        legacy_task = MyTask(
            id=entity.id,
            description=entity.description,
            expected_output=entity.expected_output,
            agent=legacy_agent,
            async_execution=entity.async_execution,
            created_at=entity.created_at,
            context_from_async_tasks_ids=entity.context_from_async_tasks_ids,
            context_from_sync_tasks_ids=entity.context_from_sync_tasks_ids
        )
        db_utils.save_task(legacy_task)
        return entity
    
    def find_by_id(self, entity_id: str) -> Optional[TaskModel]:
        """Find a task by ID."""
        legacy_tasks = db_utils.load_tasks()
        legacy_task = next((t for t in legacy_tasks if t.id == entity_id), None)
        if legacy_task:
            return self._convert_from_legacy(legacy_task)
        return None
    
    def find_all(self) -> List[TaskModel]:
        """Find all tasks."""
        legacy_tasks = db_utils.load_tasks()
        return [self._convert_from_legacy(task) for task in legacy_tasks]
    
    def delete(self, entity_id: str) -> bool:
        """Delete a task by ID."""
        try:
            db_utils.delete_task(entity_id)
            return True
        except Exception:
            return False
    
    def exists(self, entity_id: str) -> bool:
        """Check if a task exists."""
        return self.find_by_id(entity_id) is not None
    
    def find_by_agent_id(self, agent_id: str) -> List[TaskModel]:
        """Find tasks by agent ID."""
        tasks = self.find_all()
        return [t for t in tasks if t.agent and t.agent.id == agent_id]
    
    def _convert_from_legacy(self, legacy_task) -> TaskModel:
        """Convert legacy MyTask object to TaskModel."""
        agent = None
        if legacy_task.agent:
            agent = AgentModel(
                id=legacy_task.agent.id,
                role=legacy_task.agent.role,
                backstory=legacy_task.agent.backstory,
                goal=legacy_task.agent.goal,
                temperature=legacy_task.agent.temperature,
                allow_delegation=legacy_task.agent.allow_delegation,
                verbose=legacy_task.agent.verbose,
                cache=legacy_task.agent.cache,
                llm_provider_model=legacy_task.agent.llm_provider_model,
                max_iter=legacy_task.agent.max_iter,
                created_at=legacy_task.agent.created_at,
                tools=legacy_task.agent.tools,
                knowledge_source_ids=legacy_task.agent.knowledge_source_ids
            )
        
        return TaskModel(
            id=legacy_task.id,
            description=legacy_task.description,
            expected_output=legacy_task.expected_output,
            agent=agent,
            async_execution=legacy_task.async_execution,
            created_at=legacy_task.created_at,
            context_from_async_tasks_ids=legacy_task.context_from_async_tasks_ids,
            context_from_sync_tasks_ids=legacy_task.context_from_sync_tasks_ids
        )
