/**
 * AppLayout tests.
 *
 * Guards against regressions in the authenticated app shell:
 *   - Auth redirect: unauthenticated users go to /sign-in
 *   - Terms gate: returning users with stale terms see TermsGate
 *   - No double render: terms acceptance is derived, not stateful
 *   - Router stability: unstable router ref doesn't cause extra renders
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = vi.fn()
let mockUser: object | null = { uid: 'uid-1', email: 'test@test.com' }
let mockLoading = false

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/discover',
}))

vi.mock('@/context/auth-context', () => ({
  useAuthContext: () => ({
    user: mockUser,
    loading: mockLoading,
    getIdToken: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}))

const mockGet = vi.fn()

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    get: mockGet,
    post: vi.fn(),
    patch: vi.fn(),
    getList: vi.fn(),
    delete: vi.fn(),
  }),
}))

// Stub BottomNav and TermsGate to isolate layout logic
vi.mock('@/components/bottom-nav', () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}))

vi.mock('@/components/terms-gate', () => ({
  TermsGate: ({ onAccepted }: { onAccepted: () => void }) => (
    <div data-testid="terms-gate">
      <button onClick={onAccepted}>Accept</button>
    </div>
  ),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

// Dynamic import so mocks are in place before the module loads
async function getAppLayout() {
  const mod = await import('@/app/(app)/layout')
  return mod.default
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderLayout(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      {ui}
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockUser = { uid: 'uid-1', email: 'test@test.com' }
  mockLoading = false
  mockReplace.mockClear()
  mockGet.mockReset()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AppLayout', () => {
  it('redirects to /sign-in when user is not authenticated', async () => {
    mockUser = null
    const AppLayout = await getAppLayout()
    renderLayout(<AppLayout><div>child</div></AppLayout>)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/sign-in')
    })
  })

  it('shows nothing while auth is loading', async () => {
    mockLoading = true
    const AppLayout = await getAppLayout()
    const { container } = renderLayout(<AppLayout><div data-testid="child">child</div></AppLayout>)

    expect(container.innerHTML).toBe('')
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated and terms are accepted', async () => {
    mockGet.mockResolvedValue({ data: { termsVersion: '1.0' } })
    const AppLayout = await getAppLayout()
    renderLayout(<AppLayout><div data-testid="child">child</div></AppLayout>)

    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
  })

  it('shows TermsGate when terms are stale', async () => {
    mockGet.mockResolvedValue({ data: { termsVersion: '0.0' } })
    const AppLayout = await getAppLayout()
    renderLayout(<AppLayout><div data-testid="child">child</div></AppLayout>)

    await waitFor(() => {
      expect(screen.getByTestId('terms-gate')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
  })

  it('does not double-render children when profile loads with accepted terms', async () => {
    // Track render count via a callback ref
    let renderCount = 0
    function TrackRenders() {
      renderCount++
      return <div data-testid="child">rendered</div>
    }

    // Simulate profile loading with a delay
    mockGet.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { termsVersion: '1.0' } }), 10)),
    )

    const AppLayout = await getAppLayout()
    renderLayout(<AppLayout><TrackRenders /></AppLayout>)

    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    // The child should render once when the layout first shows children,
    // then once more when the profile query resolves (React Query updates).
    // It must NOT render a third time from a useEffect/setState cycle.
    // With derived state: auth resolves → render (profileLoading gate) → profile loads → render = 2
    // With the old useState+useEffect bug: it would be 3 (extra setState re-render).
    expect(renderCount).toBeLessThanOrEqual(2)
  })

  it('does not re-run redirect effect when router reference changes', async () => {
    mockUser = null
    const AppLayout = await getAppLayout()
    const { rerender } = renderLayout(<AppLayout><div>child</div></AppLayout>)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/sign-in')
    })

    const callCount = mockReplace.mock.calls.length

    // Re-render — the router object would normally be a new reference.
    // The redirect effect should NOT re-fire because its deps are [user, loading].
    rerender(
      <QueryClientProvider client={createQueryClient()}>
        <AppLayout><div>child</div></AppLayout>
      </QueryClientProvider>,
    )

    // Allow any effects to flush
    await new Promise((r) => setTimeout(r, 10))
    expect(mockReplace).toHaveBeenCalledTimes(callCount)
  })
})
