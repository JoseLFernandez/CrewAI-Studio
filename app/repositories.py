"""
Repository pattern for data persistence.

This module provides abstract interfaces for data operations and concrete
implementations for different data sources.
"""
from abc import ABC, abstractmethod
from typing import List, Optional, TypeVar, Generic, Protocol
from datetime import datetime

# Type variables for generic repository
T = TypeVar('T')
ID = TypeVar('ID')

class Entity(Protocol):
    """Protocol for entities that can be persisted."""
    id: str


class Repository(ABC, Generic[T]):
    """Abstract base class for repositories."""
    
    @abstractmethod
    def save(self, entity: T) -> T:
        """Save an entity."""
        pass
    
    @abstractmethod
    def find_by_id(self, entity_id: str) -> Optional[T]:
        """Find an entity by ID."""
        pass
    
    @abstractmethod
    def find_all(self) -> List[T]:
        """Find all entities."""
        pass
    
    @abstractmethod
    def delete(self, entity_id: str) -> bool:
        """Delete an entity by ID."""
        pass
    
    @abstractmethod
    def exists(self, entity_id: str) -> bool:
        """Check if an entity exists."""
        pass


class CrewRepository(Repository[T], ABC):
    """Specialized repository interface for crew entities."""
    
    @abstractmethod
    def find_by_name(self, name: str) -> Optional[T]:
        """Find a crew by name."""
        pass


class AgentRepository(Repository[T], ABC):
    """Specialized repository interface for agent entities."""
    
    @abstractmethod
    def find_by_role(self, role: str) -> Optional[T]:
        """Find an agent by role."""
        pass


class TaskRepository(Repository[T], ABC):
    """Specialized repository interface for task entities."""
    
    @abstractmethod
    def find_by_agent_id(self, agent_id: str) -> List[T]:
        """Find tasks by agent ID."""
        pass
