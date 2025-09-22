"""
Improved MyCrew class with better architecture.

This class follows the separation of concerns principle:
- Uses dependency injection for state management
- Separates UI concerns from business logic  
- Uses type hints and proper documentation
- Centralizes key management
"""
from typing import Optional, List, Any
import streamlit as st
from crewai import Process

from models import CrewModel, CrewProcess
from services import CrewService
from state_context import StateContext, StateKeyManager
from utils import rnd_id, fix_columns_width
from llms import llm_providers_and_models


class CrewController:
    """
    Controller for crew UI and business operations.
    
    This class handles the interaction between the UI layer and business logic,
    using dependency injection for better testability and separation of concerns.
    """
    
    def __init__(self, 
                 crew_service: CrewService,
                 state_context: StateContext):
        """
        Initialize the crew controller.
        
        Args:
            crew_service: Service for crew business operations
            state_context: Context for state management
        """
        self.crew_service = crew_service
        self.state = state_context
        
    def create_crew(self, name: Optional[str] = None) -> CrewModel:
        """Create a new crew."""
        crew = self.crew_service.create_crew(name)
        self._initialize_state_keys(crew)
        return crew
    
    def update_crew_from_state(self, crew: CrewModel) -> None:
        """Update crew from current state values."""
        keys = StateKeyManager(crew.id)
        
        # Update all crew properties from state
        crew.name = self.state.get(keys.name_key(), crew.name)
        
        # Convert process enum
        process_value = self.state.get(keys.process_key(), crew.process)
        if isinstance(process_value, Process):
            crew.process = CrewProcess.SEQUENTIAL if process_value == Process.sequential else CrewProcess.HIERARCHICAL
        
        crew.verbose = self.state.get(keys.verbose_key(), crew.verbose)
        crew.memory = self.state.get(keys.memory_key(), crew.memory)
        crew.cache = self.state.get(keys.cache_key(), crew.cache)
        crew.planning = self.state.get(keys.planning_key(), crew.planning)
        crew.max_rpm = self.state.get(keys.max_rpm_key(), crew.max_rpm)
        
        # Update manager settings
        manager_llm = self.state.get(keys.manager_llm_key())
        crew.manager_llm = manager_llm if manager_llm != "None" else None
        
        # Clear manager agent if manager LLM is set
        if crew.manager_llm:
            crew.manager_agent = None
            
        self.crew_service.update_crew(crew)
    
    def delete_crew(self, crew: CrewModel) -> None:
        """Delete a crew."""
        success = self.crew_service.delete_crew(crew.id)
        if success:
            self._cleanup_state_keys(crew)
    
    def is_editing(self, crew: CrewModel) -> bool:
        """Check if crew is in edit mode."""
        keys = StateKeyManager(crew.id)
        return self.state.get(keys.edit_key(), False)
    
    def set_editing(self, crew: CrewModel, editing: bool) -> None:
        """Set crew edit mode."""
        keys = StateKeyManager(crew.id)
        self.state.set(keys.edit_key(), editing)
        if not editing:
            # Save changes when exiting edit mode
            self.update_crew_from_state(crew)
    
    def get_validation_errors(self, crew: CrewModel) -> List[str]:
        """Get validation errors for a crew."""
        return self.crew_service.validate_crew(crew)
    
    def _create_update_callback(self, crew: CrewModel):
        """Create a callback function for updating crew state."""
        def callback():
            self.update_crew_from_state(crew)
        return callback
    
    def _create_delete_callback(self, crew: CrewModel):
        """Create a callback function for deleting crew."""
        def callback():
            self.delete_crew(crew)
        return callback
    
    def _create_edit_callback(self, crew: CrewModel, editing: bool):
        """Create a callback function for setting edit mode."""
        def callback():
            self.set_editing(crew, editing)
        return callback
    
    def _create_agents_update_callback(self, crew: CrewModel):
        """Create a callback function for updating agents."""
        def callback():
            self._update_agents(crew)
        return callback
    
    def _create_tasks_update_callback(self, crew: CrewModel):
        """Create a callback function for updating tasks."""
        def callback():
            self._update_tasks(crew)
        return callback
    
    def _create_manager_agent_update_callback(self, crew: CrewModel):
        """Create a callback function for updating manager agent."""
        def callback():
            self._update_manager_agent(crew)
        return callback

    def render_crew_form(self, crew: CrewModel) -> None:
        """Render the crew edit form."""
        keys = StateKeyManager(crew.id)
        is_hierarchical = crew.process == CrewProcess.HIERARCHICAL

        with st.container(border=True):
            # Name
            st.text_input(
                "Name (just id, it doesn't affect anything)",
                value=crew.name,
                key=keys.name_key(),
                on_change=lambda: self.update_crew_from_state(crew),
            )

            # Process
            process_options = [Process.sequential, Process.hierarchical]
            current_process = Process.sequential if crew.process == CrewProcess.SEQUENTIAL else Process.hierarchical
            st.selectbox(
                "Process",
                options=process_options,
                index=process_options.index(current_process),
                key=keys.process_key(),
                format_func=lambda p: "Sequential" if p == Process.sequential else "Hierarchical",
                on_change=lambda: self.update_crew_from_state(crew),
            )

            # Agents
            available_agents = self.state.get("agents", [])
            available_agent_roles = [agent.role for agent in available_agents]
            st.multiselect(
                "Agents",
                options=available_agent_roles,
                default=[role for role in [agent.role for agent in crew.agents] if role in available_agent_roles],
                key=keys.agents_key(),
                on_change=lambda: self._update_agents(crew),
            )

            # Tasks (filtered by selected agents)
            available_tasks = self.state.get("tasks", [])
            agent_ids = {agent.id for agent in crew.agents}
            filtered_tasks = [t for t in available_tasks if t.agent and t.agent.id in agent_ids]
            filtered_task_ids = [t.id for t in filtered_tasks]
            st.multiselect(
                "Tasks",
                options=filtered_task_ids,
                default=[tid for tid in [t.id for t in crew.tasks] if tid in filtered_task_ids],
                key=keys.tasks_key(),
                on_change=lambda: self._update_tasks(crew),
            )

            # Manager settings (hierarchical only)
            st.selectbox(
                "Manager LLM",
                options=["None"] + llm_providers_and_models(),
                index=(
                    0 if (not crew.manager_llm or crew.manager_llm not in llm_providers_and_models())
                    else (llm_providers_and_models().index(crew.manager_llm) + 1)
                ),
                key=keys.manager_llm_key(),
                on_change=lambda: self.update_crew_from_state(crew),
                disabled=not is_hierarchical,
            )

            st.selectbox(
                "Manager Agent",
                options=["None"] + [a.role for a in available_agents],
                index=(
                    0 if (crew.manager_agent is None or crew.manager_agent.role not in [a.role for a in available_agents])
                    else ([a.role for a in available_agents].index(crew.manager_agent.role) + 1)
                ),
                key=keys.manager_agent_key(),
                on_change=lambda: self._update_manager_agent(crew),
                disabled=not is_hierarchical,
            )

            # Other settings
            st.checkbox(
                "Verbose",
                value=crew.verbose,
                key=keys.verbose_key(),
                on_change=lambda: self.update_crew_from_state(crew),
            )

            st.checkbox(
                "Memory",
                value=crew.memory,
                key=keys.memory_key(),
                on_change=lambda: self.update_crew_from_state(crew),
            )

            st.checkbox(
                "Cache",
                value=crew.cache,
                key=keys.cache_key(),
                on_change=lambda: self.update_crew_from_state(crew),
            )

            st.checkbox(
                "Planning",
                value=crew.planning,
                key=keys.planning_key(),
                on_change=lambda: self.update_crew_from_state(crew),
            )

            st.number_input(
                "Max req/min",
                value=crew.max_rpm,
                key=keys.max_rpm_key(),
                on_change=lambda: self.update_crew_from_state(crew),
            )

            # Save
            st.button(
                "Save",
                on_click=self._create_edit_callback(crew, False),
                key=f"btn_save_{crew.id}",
            )
    
    def render_crew_display(self, crew: CrewModel, expanded: bool = False, buttons: bool = True) -> None:
        """Render the crew display view."""
        fix_columns_width()

        # Validate and get errors
        errors = self.get_validation_errors(crew)
        expander_title = f"{self.status_icon(not errors)} Crew: {crew.name}".strip()

        with st.expander(expander_title, expanded=expanded):
            st.markdown(f"**Process:** {crew.process.name.title()}")

            if crew.process == CrewProcess.HIERARCHICAL:
                st.markdown(f"**Manager LLM:** {crew.manager_llm or 'None'}")
                st.markdown(f"**Manager Agent:** {crew.manager_agent.role if crew.manager_agent else 'None'}")

            st.markdown(f"**Verbose:** {crew.verbose}")
            st.markdown(f"**Memory:** {crew.memory}")
            st.markdown(f"**Cache:** {crew.cache}")
            st.markdown(f"**Planning:** {crew.planning}")
            st.markdown(f"**Max req/min:** {crew.max_rpm}")

            st.markdown("**Tasks:**")
            agent_ids = {agent.id for agent in crew.agents}
            valid_tasks = [t for t in crew.tasks if t.agent and t.agent.id in agent_ids]
            self.render_task_list(valid_tasks)

            # Knowledge sources
            if crew.knowledge_source_ids:
                knowledge_sources = self.state.get("knowledge_sources", [])
                source_names = [ks.name for ks in knowledge_sources if ks.id in crew.knowledge_source_ids]
                if source_names:
                    st.markdown(f"**Knowledge Sources:** {', '.join(source_names)}")

            # Validation errors
            if errors:
                for error in errors:
                    st.warning(error)

            # Action buttons
            if buttons:
                col1, col2 = st.columns(2)
                with col1:
                    st.button(
                        "Edit",
                        on_click=lambda: self.set_editing(crew, True),
                        key=f"btn_edit_{crew.id}",
                    )
                with col2:
                    st.button(
                        "Delete",
                        on_click=lambda: self.delete_crew(crew),
                        key=f"btn_delete_{crew.id}",
                    )
    
    def render_crew(self, crew: CrewModel, expanded: bool = False, buttons: bool = True) -> None:
        """Render a crew (either form or display based on edit mode)."""
        if self.is_editing(crew):
            self.render_crew_form(crew)
        else:
            self.render_crew_display(crew, expanded, buttons)
    
    def _initialize_state_keys(self, crew: CrewModel) -> None:
        """Initialize state keys for a new crew."""
        keys = StateKeyManager(crew.id)
        
        # Initialize all state keys with default values
        if not self.state.has(keys.edit_key()):
            self.state.set(keys.edit_key(), True)  # New crews start in edit mode
        
        if not self.state.has(keys.tasks_order_key()):
            self.state.set(keys.tasks_order_key(), [task.id for task in crew.tasks])
    
    def _cleanup_state_keys(self, crew: CrewModel) -> None:
        """Clean up state keys when a crew is deleted."""
        keys = StateKeyManager(crew.id)
        
        # List of all possible state keys for this crew
        key_methods = [
            keys.edit_key, keys.name_key, keys.process_key, keys.verbose_key,
            keys.agents_key, keys.tasks_key, keys.tasks_order_key,
            keys.manager_llm_key, keys.manager_agent_key, keys.memory_key,
            keys.planning_key, keys.cache_key, keys.max_rpm_key,
            keys.knowledge_sources_key
        ]
        
        for key_method in key_methods:
            try:
                self.state.delete(key_method())
            except:
                pass  # Ignore errors when deleting non-existent keys
    
    def _update_agents(self, crew: CrewModel) -> None:
        """Update crew agents from state."""
        keys = StateKeyManager(crew.id)
        selected_roles = self.state.get(keys.agents_key(), [])
        available_agents = self.state.get('agents', [])
        
        crew.agents = [agent for agent in available_agents if agent.role in selected_roles]
        self.crew_service.update_crew(crew)
    
    def _update_tasks(self, crew: CrewModel) -> None:
        """Update crew tasks from state."""
        keys = StateKeyManager(crew.id)
        selected_task_ids = self.state.get(keys.tasks_key(), [])
        available_tasks = self.state.get('tasks', [])
        agent_ids = {agent.id for agent in crew.agents}
        
        # Filter tasks to only include those with agents in the crew
        crew.tasks = [
            task for task in available_tasks 
            if task.id in selected_task_ids and task.agent and task.agent.id in agent_ids
        ]
        
        # Sort tasks according to selection order
        crew.tasks = sorted(crew.tasks, key=lambda task: selected_task_ids.index(task.id))
        self.state.set(keys.tasks_order_key(), selected_task_ids)
        self.crew_service.update_crew(crew)
    
    def _update_manager_agent(self, crew: CrewModel) -> None:
        """Update crew manager agent from state."""
        keys = StateKeyManager(crew.id)
        selected_agent_role = self.state.get(keys.manager_agent_key())
        available_agents = self.state.get('agents', [])
        
        if selected_agent_role and selected_agent_role != "None":
            crew.manager_agent = next(
                (agent for agent in available_agents if agent.role == selected_agent_role), 
                None
            )
        else:
            crew.manager_agent = None
        
        # Clear manager LLM if manager agent is set
        if crew.manager_agent:
            crew.manager_llm = None
            
        self.crew_service.update_crew(crew)

    @staticmethod
    def status_icon(is_valid: bool) -> str:
        return "" if is_valid else "❗"

    def render_task_list(self, tasks: List[Any]) -> None:
        for i, task in enumerate(tasks, 1):
            with st.container(border=True):
                async_tag = "(async)" if getattr(task, 'async_execution', False) else ""
                st.markdown(f"**{i}.{async_tag} {task.description}**")
                st.markdown(f"**Agent:** {task.agent.role if task.agent else 'None'}")
                tools_list = ", ".join([tool.name for tool in task.agent.tools]) if task.agent and task.agent.tools else "None"
                st.markdown(f"**Tools:** {tools_list}")
                st.markdown(f"**LLM:** {task.agent.llm_provider_model if task.agent else 'None'}")
