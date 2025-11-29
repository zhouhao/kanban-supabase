import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../authStore'
import type { UserProfile } from '../authStore'

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}))

// Import after mocking
import { supabase } from '@/lib/supabase'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      profile: null,
      loading: true,
    })
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('initialize', () => {
    it('should set loading to false when no session exists', async () => {
      // Mock no session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any)

      const store = useAuthStore.getState()
      await store.initialize()

      expect(useAuthStore.getState().loading).toBe(false)
      expect(useAuthStore.getState().user).toBe(null)
      expect(useAuthStore.getState().profile).toBe(null)
    })

    it('should set user and profile when session exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      } as any

      const mockProfile: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
      }

      // Mock session exists
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      } as any)

      // Mock profile fetch
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useAuthStore.getState()
      await store.initialize()

      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().profile).toEqual(mockProfile)
      expect(useAuthStore.getState().loading).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      // Mock error
      vi.mocked(supabase.auth.getSession).mockRejectedValue(
        new Error('Network error')
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const store = useAuthStore.getState()
      await store.initialize()

      expect(useAuthStore.getState().loading).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Initialize auth error:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should setup auth state change listener', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any)

      const store = useAuthStore.getState()
      await store.initialize()

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled()
    })
  })

  describe('signIn', () => {
    it('should successfully sign in user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      } as any

      const mockProfile: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
      }

      // Mock successful sign in
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      } as any)

      // Mock profile fetch
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useAuthStore.getState()
      const result = await store.signIn('test@example.com', 'password123')

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().profile).toEqual(mockProfile)
    })

    it('should return error for invalid credentials', async () => {
      // Mock sign in error
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' } as any,
      } as any)

      const store = useAuthStore.getState()
      const result = await store.signIn('test@example.com', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid login credentials')
      expect(useAuthStore.getState().user).toBe(null)
    })

    it('should handle network errors', async () => {
      // Mock network error
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(
        new Error('Network error')
      )

      const store = useAuthStore.getState()
      const result = await store.signIn('test@example.com', 'password123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('signUp', () => {
    it('should successfully sign up new user', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'newuser@example.com',
      } as any

      const mockProfile: UserProfile = {
        id: 'user-456',
        email: 'newuser@example.com',
        full_name: 'New User',
        created_at: '2024-01-01T00:00:00Z',
      }

      // Mock successful sign up
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      } as any)

      // Mock profile fetch
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useAuthStore.getState()
      const result = await store.signUp(
        'newuser@example.com',
        'password123',
        'New User'
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().profile).toEqual(mockProfile)
    })

    it('should return error when email already exists', async () => {
      // Mock sign up error
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' } as any,
      } as any)

      const store = useAuthStore.getState()
      const result = await store.signUp(
        'existing@example.com',
        'password123',
        'Existing User'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('User already registered')
    })

    it('should wait for profile creation trigger', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'test@example.com',
      } as any

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      } as any)

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useAuthStore.getState()
      const startTime = Date.now()
      await store.signUp('test@example.com', 'password123', 'Test User')
      const endTime = Date.now()

      // Should wait at least 500ms for profile creation
      expect(endTime - startTime).toBeGreaterThanOrEqual(500)
    })
  })

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      // Set initial state with logged in user
      useAuthStore.setState({
        user: { id: 'user-123' } as any,
        profile: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
        loading: false,
      })

      // Mock successful sign out
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })

      const store = useAuthStore.getState()
      await store.signOut()

      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(useAuthStore.getState().user).toBe(null)
      expect(useAuthStore.getState().profile).toBe(null)
    })

    it('should handle sign out errors gracefully', async () => {
      useAuthStore.setState({
        user: { id: 'user-123' } as any,
        profile: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
        loading: false,
      })

      // Mock sign out error
      vi.mocked(supabase.auth.signOut).mockRejectedValue(
        new Error('Sign out failed')
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const store = useAuthStore.getState()
      await store.signOut()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sign out error:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })
})
