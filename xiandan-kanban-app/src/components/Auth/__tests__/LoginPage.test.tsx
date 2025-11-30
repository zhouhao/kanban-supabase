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

    expect(screen.getByText('登录到咸蛋快板')).toBeInTheDocument()
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument()
  })

  it('should update page title on mount', () => {
    renderLoginPage()
    expect(document.title).toBe('登录 - 咸蛋快板')
  })

  it('should show error when submitting empty form', async () => {
    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: /登录/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('请填写所有字段')).toBeInTheDocument()
    })

    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('should call signIn with email and password', async () => {
    mockSignIn.mockResolvedValue({ success: true })

    renderLoginPage()

    const emailInput = screen.getByLabelText('邮箱')
    const passwordInput = screen.getByLabelText('密码')
    const submitButton = screen.getByRole('button', { name: /登录/i })

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

    const emailInput = screen.getByLabelText('邮箱')
    const passwordInput = screen.getByLabelText('密码')
    const submitButton = screen.getByRole('button', { name: /登录/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should show error message on failed login', async () => {
    mockSignIn.mockResolvedValue({ success: false, error: '登录失败：邮箱或密码错误' })

    renderLoginPage()

    const emailInput = screen.getByLabelText('邮箱')
    const passwordInput = screen.getByLabelText('密码')
    const submitButton = screen.getByRole('button', { name: /登录/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('登录失败：邮箱或密码错误')).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should disable submit button while loading', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      signIn: mockSignIn,
      loading: true,
    } as any)

    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: /登录中/i })
    expect(submitButton).toBeDisabled()
  })

  it('should have link to register page', () => {
    renderLoginPage()

    const registerLink = screen.getByText('立即注册')
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
  })
})
