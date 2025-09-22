import streamlit as st
from streamlit import session_state as ss
import db_utils
import json
from datetime import datetime
from uuid import uuid4

class PageFlows:
    def __init__(self):
        self.name = "Flows"

    def create_flow(self):
        """Create a new empty flow."""
        flow = {
            'id': str(uuid4()),
            'name': '',
            'nodes': [],
            'edges': [],
            'created_at': datetime.now().isoformat(),
            'edit': True
        }
        if 'flows' not in ss:
            ss.flows = []
        ss.flows.append(flow)
        db_utils.save_flow(flow['id'], {
            'name': flow['name'],
            'nodes': flow['nodes'],
            'edges': flow['edges'],
            'created_at': flow['created_at']
        })
        return flow

    def delete_flow(self, flow_id):
        """Delete a flow."""
        if 'flows' in ss:
            ss.flows = [f for f in ss.flows if f['id'] != flow_id]
        db_utils.delete_flow(flow_id)
        st.rerun()

    def save_flow(self, flow):
        """Save flow changes."""
        flow['edit'] = False
        db_utils.save_flow(flow['id'], {
            'name': flow['name'],
            'nodes': flow['nodes'],
            'edges': flow['edges'],
            'created_at': flow['created_at']
        })
        # Force session state update
        ss.flows = ss.flows.copy()
        st.rerun()

    def cancel_edit(self, flow):
        """Cancel editing a flow."""
        flow['edit'] = False
        # Force session state update
        ss.flows = ss.flows.copy()
        st.rerun()

    def edit_flow(self, flow):
        """Enable editing mode for a flow."""
        flow['edit'] = True
        # Force session state update by reassigning the flows list
        ss.flows = ss.flows.copy()
        st.rerun()

    def draw_flow(self, flow):
        """Draw a single flow in the UI."""
        with st.expander(f"Flow: {flow['name'] if flow['name'] else flow['id'][:8]}", expanded=flow.get('edit', False)):
            if flow.get('edit', False):
                # Edit mode
                col1, col2 = st.columns([3, 1])
                with col1:
                    flow['name'] = st.text_input("Flow Name", 
                                               value=flow.get('name', ''), 
                                               key=f"flow_name_{flow['id']}")
                
                st.write("**Flow Structure:**")
                
                # Display nodes
                if flow.get('nodes'):
                    st.write("Nodes:")
                    for i, node in enumerate(flow['nodes']):
                        st.write(f"- {node.get('type', 'Unknown')} ({node.get('id', 'no-id')})")
                else:
                    st.write("No nodes defined")
                
                # Display edges
                if flow.get('edges'):
                    st.write("Connections:")
                    for edge in flow['edges']:
                        st.write(f"- {edge.get('source', 'unknown')} → {edge.get('target', 'unknown')}")
                else:
                    st.write("No connections defined")
                
                # Raw JSON editor for advanced users
                with st.expander("Advanced: Edit Raw JSON"):
                    nodes_json = st.text_area("Nodes (JSON)", 
                                            value=json.dumps(flow.get('nodes', []), indent=2),
                                            height=150,
                                            key=f"nodes_json_{flow['id']}")
                    edges_json = st.text_area("Edges (JSON)", 
                                            value=json.dumps(flow.get('edges', []), indent=2),
                                            height=150,
                                            key=f"edges_json_{flow['id']}")
                    
                    try:
                        flow['nodes'] = json.loads(nodes_json)
                        flow['edges'] = json.loads(edges_json)
                    except json.JSONDecodeError as e:
                        st.error(f"Invalid JSON: {e}")
                
                # Action buttons
                col1, col2, col3 = st.columns(3)
                with col1:
                    save_key = f"save_{flow['id']}"
                    if st.button("Save", key=save_key):
                        # Save the flow
                        db_utils.save_flow(flow['id'], {
                            'name': flow['name'],
                            'nodes': flow['nodes'],
                            'edges': flow['edges'],
                            'created_at': flow['created_at']
                        })
                        # Update session state
                        for i, f in enumerate(ss.flows):
                            if f['id'] == flow['id']:
                                ss.flows[i]['edit'] = False
                                ss.flows[i]['name'] = flow['name']
                                break
                        ss.flows = ss.flows.copy()
                        st.rerun()
                with col2:
                    cancel_key = f"cancel_{flow['id']}"
                    if st.button("Cancel", key=cancel_key):
                        # Cancel editing - reload from database
                        flows_from_db = db_utils.load_flows()
                        for flow_db in flows_from_db:
                            flow_db['edit'] = False
                        ss.flows = flows_from_db
                        st.rerun()
                with col3:
                    if st.button("Delete", key=f"delete_{flow['id']}", type="secondary"):
                        if st.session_state.get(f"confirm_delete_{flow['id']}", False):
                            self.delete_flow(flow['id'])
                        else:
                            st.session_state[f"confirm_delete_{flow['id']}"] = True
                            st.warning("Click Delete again to confirm")
            else:
                # View mode
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.write(f"**Name:** {flow.get('name', 'Unnamed Flow')}")
                    st.write(f"**ID:** {flow['id']}")
                    st.write(f"**Created:** {flow.get('created_at', 'Unknown')}")
                    st.write(f"**Nodes:** {len(flow.get('nodes', []))}")
                    st.write(f"**Connections:** {len(flow.get('edges', []))}")
                
                with col2:
                    edit_key = f"edit_{flow['id']}"
                    if st.button("Edit", key=edit_key):
                        st.write(f"DEBUG: Edit button clicked for flow {flow['id']}")
                        # Find the flow in session state and modify it directly
                        flow_found = False
                        for i, f in enumerate(ss.flows):
                            if f['id'] == flow['id']:
                                st.write(f"DEBUG: Found flow at index {i}, setting edit=True")
                                ss.flows[i]['edit'] = True
                                flow_found = True
                                break
                        if not flow_found:
                            st.write(f"DEBUG: Flow {flow['id']} not found in session state!")
                        # Force session state update
                        ss.flows = ss.flows.copy()
                        st.write(f"DEBUG: Session state updated, calling st.rerun() to activate edit mode")
                        st.rerun()

    def draw(self):
        """Draw the main flows page."""
        with st.container():
            st.subheader(self.name)
            
            # Info about flows
            st.info("""
            **Note:** This is a basic flow management interface for the Streamlit frontend. 
            For a visual flow editor with drag-and-drop functionality, use the React frontend 
            which includes the FlowEditor component.
            """)
            
            # Refresh button
            if st.button("Refresh Flows", key="refresh_flows"):
                flows_from_db = db_utils.load_flows()
                # Initialize edit state for flows
                for flow in flows_from_db:
                    if 'edit' not in flow:
                        flow['edit'] = False
                ss.flows = flows_from_db
                st.rerun()
            
            # Load flows if not already loaded
            if 'flows' not in ss:
                flows_from_db = db_utils.load_flows()
                # Initialize edit state for flows
                for flow in flows_from_db:
                    if 'edit' not in flow:
                        flow['edit'] = False
                ss.flows = flows_from_db
            
            # Check if any flow is being edited
            editing = any(flow.get('edit', False) for flow in ss.flows)
            
            # Display flows
            if len(ss.flows) == 0:
                st.write("No flows defined yet.")
            else:
                st.write(f"DEBUG: Currently have {len(ss.flows)} flows in session state:")
                for i, flow in enumerate(ss.flows):
                    st.write(f"  {i}: {flow.get('name', 'Unnamed')} (edit={flow.get('edit', False)})")
                st.write("---")
                for flow in ss.flows:
                    self.draw_flow(flow)
            
            # Create new flow button
            st.button('Create Flow', on_click=self.create_flow, disabled=editing)
            
            # Help section
            with st.expander("Help"):
                st.write("""
                **Flows** are visual workflows that connect different components together.
                
                - **Nodes** represent individual components or steps in your workflow
                - **Edges** represent connections between nodes, showing how data flows
                - Each flow has a unique ID and can be given a descriptive name
                
                **Visual Editor:** For a more user-friendly visual editor, switch to the React frontend 
                which provides drag-and-drop functionality for building flows.
                """)
