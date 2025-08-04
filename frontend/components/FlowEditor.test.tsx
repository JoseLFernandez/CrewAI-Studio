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
    Controls: () => <div data-testid="controls" />,
    addEdge: jest.fn(),
    applyEdgeChanges: jest.fn(),
    applyNodeChanges: jest.fn(),
  }),
  { virtual: true }
);

test('renders FlowEditor', () => {
  render(<FlowEditor />);
  expect(screen.getByPlaceholderText('Flow ID')).toBeInTheDocument();
});

