import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import { useAuthStore } from '../../../stores/authStore'

// Mock the auth store
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

// Mock react-router-dom navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginPage', () => {
  const mockSignIn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      signIn: mockSignIn,
      loading: false,
    } as any)
  })

  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
  }

  it('should render login form', () => {
    renderLoginPage()

    expect(screen.getByText('Login to Xiandan Kanban')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument()
  })

  it('should update page title on mount', () => {
    renderLoginPage()
    expect(document.title).toBe('Login - Xiandan Kanban')
  })

  it('should show error when submitting empty form', async () => {
    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: /Login/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
    })

    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('should call signIn with email and password', async () => {
    mockSignIn.mockResolvedValue({ success: true })

    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /Login/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should navigate to dashboard on successful login', async () => {
    mockSignIn.mockResolvedValue({ success: true })

    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /Login/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should show error message on failed login', async () => {
    mockSignIn.mockResolvedValue({ success: false, error: 'Login failed: email or password incorrect' })

    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /Login/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Login failed: email or password incorrect')).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should disable submit button while loading', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      signIn: mockSignIn,
      loading: true,
    } as any)

    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: /Logging in/i })
    expect(submitButton).toBeDisabled()
  })

  it('should have link to register page', () => {
    renderLoginPage()

    const registerLink = screen.getByText('Register Now')
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
  })
})
