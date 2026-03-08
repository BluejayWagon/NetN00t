import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Provide a factory with bare jest.fn() stubs. CRA sets resetMocks: true, so
// any implementations set here (e.g. mockResolvedValue) would be wiped before
// each test. Implementations are configured in beforeEach instead.
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  isAxiosError: jest.fn(),
}));

import App from './App';
import axios from 'axios';

beforeEach(() => {
  // Re-apply implementations after resetMocks wipes them.
  // Return appropriate shapes per endpoint so the component doesn't crash.
  (axios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('boardconfig')) {
      return Promise.resolve({ data: { boardTypes: [], monitorOrientations: [] } });
    }
    if (url.includes('/api/config')) {
      return Promise.resolve({ data: { romDirectory: '/roms/naomi' } });
    }
    return Promise.resolve({ data: [] });
  });
  (axios.post as jest.Mock).mockResolvedValue({ data: {} });
  (axios.put as jest.Mock).mockResolvedValue({ data: {} });
  (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
  // jsdom does not implement window.alert; silence it
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders the app header', async () => {
  await act(async () => {
    render(<App />);
  });
  expect(screen.getByText(/Netboot Portal/i)).toBeInTheDocument();
});

test('shows ROM list when ROM directory is configured', async () => {
  await act(async () => {
    render(<App />);
  });
  // When romDirectory is set, the settings dialog should not be shown as first-run
  expect(screen.queryByText(/Welcome — Set Your ROM Directory/i)).not.toBeInTheDocument();
});

test('shows settings dialog on first run when no ROM directory set', async () => {
  (axios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('boardconfig')) {
      return Promise.resolve({ data: { boardTypes: [], monitorOrientations: [] } });
    }
    if (url.includes('/api/config')) {
      return Promise.resolve({ data: { romDirectory: '' } });
    }
    return Promise.resolve({ data: [] });
  });

  await act(async () => {
    render(<App />);
  });

  expect(screen.getByText(/Welcome — Set Your ROM Directory/i)).toBeInTheDocument();
});
