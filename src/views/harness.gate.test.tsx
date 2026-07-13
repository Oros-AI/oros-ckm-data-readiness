/** @vitest-environment jsdom */
// Harness smoke test for Increment 2 render gates — verifies jsdom + RTL
// wiring only; real view assertions live in the Increment 2 gate suite.

import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

function HarnessProbe() {
  return <p>harness-probe: jsdom + RTL wired</p>;
}

it('renders a trivial component and queries it via screen.getByText', () => {
  render(<HarnessProbe />);
  expect(screen.getByText('harness-probe: jsdom + RTL wired')).toBeTruthy();
});
