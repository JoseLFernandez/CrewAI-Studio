import streamlit as st
from streamlit import session_state as ss

# New architecture imports
from crew_controller import CrewController
from services import CrewService
from repository_impl import DbCrewRepository, DbAgentRepository, DbTaskRepository
from state_context import StreamlitStateContext
from models import CrewModel

class PageCrews:
    def __init__(self):
        self.name = "Crews"
        # Dependency injection wiring
        self.state = StreamlitStateContext()
        self.crew_repo = DbCrewRepository()
        self.agent_repo = DbAgentRepository()
        self.task_repo = DbTaskRepository()
        self.crew_service = CrewService(
            crew_repo=self.crew_repo,
            agent_repo=self.agent_repo,
            task_repo=self.task_repo,
            state_context=self.state,
        )
        self.controller = CrewController(
            crew_service=self.crew_service,
            state_context=self.state,
        )

    def _on_create_crew(self) -> None:
        # Create via service/controller; new crews start in edit mode
        self.controller.create_crew()
        # Optional: trigger rerun to reflect new crew immediately
        try:
            st.rerun()
        except Exception:
            pass

    def draw(self):
        with st.container():
            st.subheader(self.name)
            # Load necessary lists into state are handled by app.load_data
            crews = self.crew_service.get_all_crews()

            any_editing = False
            if crews:
                for crew in crews:
                    # Render crews; edit state will be controlled by user actions
                    self.controller.render_crew(crew)
                    if self.controller.is_editing(crew):
                        any_editing = True
            else:
                st.write("No crews defined yet.")

            st.button('Create crew', on_click=self._on_create_crew, disabled=any_editing)
