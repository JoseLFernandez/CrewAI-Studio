import React from 'react';
import { render, screen } from '@testing-library/react';
jest.mock('react-joyride', () => () => null, { virtual: true });

import FlowEditor from './FlowEditor';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    authFetch: jest
      .fn()
      .mockResolvedValue({ json: jest.fn().mockResolvedValue([]) }),
    accessToken: 'token',
  }),
  withAuth: (Component: React.ComponentType) => Component,
}));

jest.mock(
  '@xyflow/react',
  () => ({
    __esModule: true,
    ReactFlow: ({ children }: any) => <div>{children}</div>,
    Background: () => <div data-testid="background" />,
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  MiniMap: () => <div data-testid="minimap" />,
    Controls: () => <div data-testid="controls" />,
  Handle: () => <div data-testid="handle" />,
  Position: { Top: 'top', Bottom: 'bottom' },
    addEdge: jest.fn(),
    applyEdgeChanges: jest.fn(),
    applyNodeChanges: jest.fn(),
  }),
  { virtual: true }
);

test('renders FlowEditor with canvas and inspector', () => {
  render(<FlowEditor flowId="abc" initialName="My Flow" />);
  expect(screen.getByPlaceholderText('Flow name')).toBeInTheDocument();
  expect(screen.getByText('Inspector')).toBeInTheDocument();
});

