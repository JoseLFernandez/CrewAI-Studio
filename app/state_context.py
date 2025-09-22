"""
State Context - Abstraction layer for managing application state.

This module provides a clean interface for state management, replacing direct
access to streamlit.session_state throughout the application.
"""
from typing import Any, Dict, List, Optional, TypeVar, Generic, Protocol
from abc import ABC, abstractmethod
import streamlit as st
from streamlit import session_state

T = TypeVar('T')

class StateContext(Protocol):
    """Protocol defining the interface for state management."""
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from state."""
        ...
    
    def set(self, key: str, value: Any) -> None:
        """Set a value in state."""
        ...
    
    def has(self, key: str) -> bool:
        """Check if key exists in state."""
        ...
    
    def delete(self, key: str) -> None:
        """Delete a key from state."""
        ...


class StreamlitStateContext:
    """Streamlit-specific implementation of state management."""
    
    def __init__(self, session_state=None):
        """Initialize with optional session_state override for testing."""
        self._session_state = session_state or st.session_state
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from session state."""
        return self._session_state.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """Set a value in session state."""
        self._session_state[key] = value
    
    def has(self, key: str) -> bool:
        """Check if key exists in session state."""
        return key in self._session_state
    
    def delete(self, key: str) -> None:
        """Delete a key from session state."""
        if key in self._session_state:
            del self._session_state[key]


class MockStateContext:
    """Mock implementation for testing purposes."""
    
    def __init__(self):
        self._state: Dict[str, Any] = {}
    
    def get(self, key: str, default: Any = None) -> Any:
        return self._state.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        self._state[key] = value
    
    def has(self, key: str) -> bool:
        return key in self._state
    
    def delete(self, key: str) -> None:
        if key in self._state:
            del self._state[key]
    
    def clear(self) -> None:
        """Clear all state (useful for testing)."""
        self._state.clear()


class StateKeyManager:
    """Manages state keys to avoid hardcoding and conflicts."""
    
    def __init__(self, entity_id: str):
        self.entity_id = entity_id
    
    def edit_key(self) -> str:
        return f"edit_{self.entity_id}"
    
    def name_key(self) -> str:
        return f"name_{self.entity_id}"
    
    def process_key(self) -> str:
        return f"process_{self.entity_id}"
    
    def verbose_key(self) -> str:
        return f"verbose_{self.entity_id}"
    
    def agents_key(self) -> str:
        return f"agents_{self.entity_id}"
    
    def tasks_key(self) -> str:
        return f"tasks_{self.entity_id}"
    
    def tasks_order_key(self) -> str:
        return f"tasks_order_{self.entity_id}"
    
    def manager_llm_key(self) -> str:
        return f"manager_llm_{self.entity_id}"
    
    def manager_agent_key(self) -> str:
        return f"manager_agent_{self.entity_id}"
    
    def memory_key(self) -> str:
        return f"memory_{self.entity_id}"
    
    def planning_key(self) -> str:
        return f"planning_{self.entity_id}"
    
    def cache_key(self) -> str:
        return f"cache_{self.entity_id}"
    
    def max_rpm_key(self) -> str:
        return f"max_rpm_{self.entity_id}"
    
    def knowledge_sources_key(self) -> str:
        return f"knowledge_sources_{self.entity_id}"


def create_state_context() -> StateContext:
    """Factory function to create the appropriate state context."""
    return StreamlitStateContext()
