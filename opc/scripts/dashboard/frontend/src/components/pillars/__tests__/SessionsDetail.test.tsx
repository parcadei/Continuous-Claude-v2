import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionsDetail } from '../SessionsDetail'
import * as api from '@/lib/api'

vi.mock('@/lib/api', () => ({
  fetchSessions: vi.fn(),
  fetchSessionActivity: vi.fn(),
  fetchActiveFileClaims: vi.fn(),
}))

const mockSessions = {
  sessions: [
    {
      id: 'sess-001',
      project: 'C:/Users/david.hayes/continuous-claude',
      working_on: 'File claims feature',
      status: 'active' as const,
      last_heartbeat: new Date().toISOString(),
      started_at: new Date(Date.now() - 60000).toISOString(),
      file_claims: [],
      agent_summary: { total: 3, failed: 0 },
    },
  ],
  counts: { active: 1, idle: 0, stale: 0 },
  total: 1,
}

const mockFileClaims = {
  claims: [
    {
      file_path: 'C:/Users/david.hayes/project-alpha/src/main.ts',
      session_id: 'sess-001-abcdefgh',
      project: 'project-alpha',
      claimed_at: new Date(Date.now() - 120000).toISOString(),
    },
    {
      file_path: 'C:/Users/david.hayes/project-alpha/src/utils.ts',
      session_id: 'sess-001-abcdefgh',
      project: 'project-alpha',
      claimed_at: new Date(Date.now() - 60000).toISOString(),
    },
    {
      file_path: 'C:/Users/david.hayes/project-beta/src/index.py',
      session_id: 'sess-002-xxxxxxxx',
      project: 'project-beta',
      claimed_at: new Date(Date.now() - 30000).toISOString(),
    },
  ],
  total: 3,
  by_project: { 'project-alpha': 2, 'project-beta': 1 },
}

describe('SessionsDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchSessions).mockResolvedValue(mockSessions)
    vi.mocked(api.fetchSessionActivity).mockResolvedValue({
      session_id: 'sess-001',
      hooks: [],
      skills: [],
      total_hooks: 0,
      total_skills: 0,
    })
    vi.mocked(api.fetchActiveFileClaims).mockResolvedValue(mockFileClaims)
  })

  it('renders sessions tab by default', async () => {
    render(<SessionsDetail open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Sessions')).toBeInTheDocument()
      expect(screen.getByText('File Claims')).toBeInTheDocument()
    })

    // Sessions tab content should be visible
    await waitFor(() => {
      expect(screen.getByText('1 Active')).toBeInTheDocument()
    })
  })

  it('switches to file claims tab', async () => {
    render(<SessionsDetail open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('File Claims')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('File Claims'))

    await waitFor(() => {
      expect(api.fetchActiveFileClaims).toHaveBeenCalled()
    })
  })

  it('shows file claims grouped by project', async () => {
    render(<SessionsDetail open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('File Claims')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('File Claims'))

    await waitFor(() => {
      expect(screen.getByText('project-alpha')).toBeInTheDocument()
      expect(screen.getByText('project-beta')).toBeInTheDocument()
    })
  })

  it('shows active locks count in file claims', async () => {
    render(<SessionsDetail open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('File Claims')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('File Claims'))

    await waitFor(() => {
      expect(screen.getByText('3 Active Locks')).toBeInTheDocument()
    })
  })

  it('shows empty state when no file claims', async () => {
    vi.mocked(api.fetchActiveFileClaims).mockResolvedValue({
      claims: [],
      total: 0,
      by_project: {},
    })

    render(<SessionsDetail open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('File Claims')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('File Claims'))

    await waitFor(() => {
      expect(screen.getByText('No active file locks')).toBeInTheDocument()
    })
  })

  it('shows error state on file claims fetch failure', async () => {
    vi.mocked(api.fetchActiveFileClaims).mockRejectedValue(new Error('Network error'))

    render(<SessionsDetail open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('File Claims')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('File Claims'))

    await waitFor(() => {
      expect(screen.getByText('Failed to load file claims')).toBeInTheDocument()
    })
  })
})
