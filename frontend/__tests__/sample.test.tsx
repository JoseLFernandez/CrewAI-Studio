import { render, screen } from '@testing-library/react';
import React from 'react';

function SampleComponent() {
  return <div>Hello Jest</div>;
}

test('renders sample component', () => {
  render(<SampleComponent />);
  expect(screen.getByText('Hello Jest')).toBeInTheDocument();
});

