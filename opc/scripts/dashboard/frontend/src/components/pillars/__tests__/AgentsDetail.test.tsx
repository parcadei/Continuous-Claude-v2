import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentsDetail } from '../AgentsDetail'
import * as api from '@/lib/api'

vi.mock('@/lib/api', () => ({
  fetchAgentsDetails: vi.fn(),
}))

const mockAgentsData = {
  telemetry: {
    total_spawns: 166,
    success_count: 160,
    failure_count: 6,
    by_agent: {
      scout: 47,
      kraken: 90,
      maestro: 11,
      spark: 1,
    },
    unique_sessions: 22,
    recent_spawns: [
      {
        timestamp: '2026-01-15T03:00:00.000Z',
        name: 'kraken',
        session_id: 'sess-003',
        success: true,
      },
      {
        timestamp: '2026-01-14T02:00:00.000Z',
        name: 'scout',
        session_id: 'sess-002',
        success: false,
      },
    ],
  },
  agent_types: ['kraken', 'maestro', 'oracle', 'scout', 'spark'],
}

describe('AgentsDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchAgentsDetails).mockResolvedValue(mockAgentsData)
  })

  it('renders loading skeletons initially', () => {
    render(<AgentsDetail open={true} onOpenChange={() => {}} />)
    // Sheet should be open, showing loading state
    expect(screen.getByText('Agent Activity')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AgentsDetail open={false} onOpenChange={() => {}} />)
    expect(screen.queryByText('Agent Activity')).not.toBeInTheDocument()
  })

  it('displays total spawns after loading', async () => {
    render(<AgentsDetail open={true} onOpenChange={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('166')).toBeInTheDocument()
    })
  })

  it('displays success rate', async () => {
    render(<AgentsDetail open={true} onOpenChange={() => {}} />)
    await waitFor(() => {
      // 160/166 = 96.4%
      expect(screen.getByText(/96/)).toBeInTheDocument()
    })
  })

  it('displays agent type counts', async () => {
    render(<AgentsDetail open={true} onOpenChange={() => {}} />)
    await waitFor(() => {
      // 'kraken' appears in multiple places (bar chart, badge, recent spawn)
      expect(screen.getAllByText('kraken').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('scout').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('displays recent spawns', async () => {
    render(<AgentsDetail open={true} onOpenChange={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/sess-003/)).toBeInTheDocument()
    })
  })

  it('shows registered agent types', async () => {
    render(<AgentsDetail open={true} onOpenChange={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('oracle')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    vi.mocked(api.fetchAgentsDetails).mockRejectedValue(new Error('Network error'))
    render(<AgentsDetail open={true} onOpenChange={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/error|failed|unavailable/i)).toBeInTheDocument()
    })
  })
})
