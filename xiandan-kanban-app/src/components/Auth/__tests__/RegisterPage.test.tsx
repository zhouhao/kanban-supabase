import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { RegisterPage } from '../RegisterPage'
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

describe('RegisterPage', () => {
  const mockSignUp = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      signUp: mockSignUp,
      loading: false,
    } as any)
  })

  const renderRegisterPage = () => {
    return render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    )
  }

  it('should render register form', () => {
    renderRegisterPage()

    expect(screen.getByText('Register Xiandan Kanban Account')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Password')[0]).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument()
  })

  it('should update page title on mount', () => {
    renderRegisterPage()
    expect(document.title).toBe('Register - Xiandan Kanban')
  })

  it('should show error when submitting empty form', async () => {
    renderRegisterPage()

    const submitButton = screen.getByRole('button', { name: /Register/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should show error when passwords do not match', async () => {
    renderRegisterPage()

    const usernameInput = screen.getByLabelText('Username')
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInputs = screen.getAllByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Register/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should show error when password is too short', async () => {
    renderRegisterPage()

    const usernameInput = screen.getByLabelText('Username')
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInputs = screen.getAllByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Register/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInputs[0], { target: { value: '12345' } })
    fireEvent.change(confirmPasswordInput, { target: { value: '12345' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should call signUp with correct parameters', async () => {
    mockSignUp.mockResolvedValue({ success: true })

    renderRegisterPage()

    const usernameInput = screen.getByLabelText('Username')
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInputs = screen.getAllByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Register/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'testuser')
    })
  })

  it('should navigate to dashboard on successful registration', async () => {
    mockSignUp.mockResolvedValue({ success: true })

    renderRegisterPage()

    const usernameInput = screen.getByLabelText('Username')
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInputs = screen.getAllByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Register/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should show error message on failed registration', async () => {
    mockSignUp.mockResolvedValue({ success: false, error: 'Email already in use' })

    renderRegisterPage()

    const usernameInput = screen.getByLabelText('Username')
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInputs = screen.getAllByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Register/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should disable submit button while loading', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      signUp: mockSignUp,
      loading: true,
    } as any)

    renderRegisterPage()

    const submitButton = screen.getByRole('button', { name: /Registering/i })
    expect(submitButton).toBeDisabled()
  })

  it('should have link to login page', () => {
    renderRegisterPage()

    const loginLink = screen.getByText('Login Now')
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })
})
