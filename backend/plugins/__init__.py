"""Plugin loading utilities.

Plugins are simple directories placed under ``backend/plugins``. Each plugin
must contain a ``plugin.json`` file describing the nodes it provides. The JSON
file has the following structure::

    {
      "nodes": [
        {
          "type": "unique_type",
          "label": "Readable name",
          "schema": {...},
          "icon": "🧩"
        }
      ]
    }

During application start up, the :func:`load_plugins` function is invoked to
register nodes defined by all available plugins.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List


PLUGIN_DIR = Path(__file__).resolve().parent


def _plugin_config_files() -> Iterable[Path]:
    """Yield all plugin configuration files."""
    for item in PLUGIN_DIR.iterdir():
        if item.is_dir():
            config = item / "plugin.json"
            if config.exists():
                yield config


def load_plugins(register_fn: Callable[..., None]) -> None:
    """Load all plugins and register their nodes.

    Args:
        register_fn: Function used to register a node definition. It should
            accept the same arguments as ``nodes.register_node``.
    """

    for config_file in _plugin_config_files():
        with config_file.open("r", encoding="utf-8") as fh:
            config = json.load(fh)

        for node in config.get("nodes", []):
            register_fn(
                node["type"],
                label=node.get("label", node["type"]),
                schema=node.get("schema", {}),
                icon=node.get("icon", ""),
            )


def list_plugin_nodes() -> List[Dict[str, Any]]:
    """Return all nodes defined by plugins."""
    nodes: List[Dict[str, Any]] = []
    for config_file in _plugin_config_files():
        with config_file.open("r", encoding="utf-8") as fh:
            config = json.load(fh)
        nodes.extend(config.get("nodes", []))
    return nodes


__all__ = ["load_plugins", "list_plugin_nodes"]

