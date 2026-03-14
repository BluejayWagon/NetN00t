import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

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
    if (url.includes('/api/version')) {
      return Promise.resolve({ data: { version: 'v1.0.0' } });
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
  expect(screen.getByText(/NetN00t Portal/i)).toBeInTheDocument();
});

test('shows ROM list when ROM directory is configured', async () => {
  await act(async () => {
    render(<App />);
  });
  // When romDirectory is set, the settings dialog should not be shown as first-run
  expect(screen.queryByText(/Welcome — Set Your ROM Directory/i)).not.toBeInTheDocument();
});

test('shows about dialog with version when info button is clicked', async () => {
  await act(async () => {
    render(<App />);
  });

  const infoButton = screen.getByRole('button', { name: /about/i });
  await act(async () => {
    fireEvent.click(infoButton);
  });

  expect(screen.getByText(/About NetN00t/i)).toBeInTheDocument();
  expect(screen.getByText(/v1\.0\.0/i)).toBeInTheDocument();
});

test('shows settings dialog on first run when no ROM directory set', async () => {
  (axios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('boardconfig')) {
      return Promise.resolve({ data: { boardTypes: [], monitorOrientations: [] } });
    }
    if (url.includes('/api/config')) {
      return Promise.resolve({ data: { romDirectory: '' } });
    }
    if (url.includes('/api/version')) {
      return Promise.resolve({ data: { version: 'v1.0.0' } });
    }
    return Promise.resolve({ data: [] });
  });

  await act(async () => {
    render(<App />);
  });

  expect(screen.getByText(/Welcome — Set Your ROM Directory/i)).toBeInTheDocument();
});
