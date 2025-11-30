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

    expect(screen.getByText('注册咸蛋快板账号')).toBeInTheDocument()
    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument()
    expect(screen.getAllByLabelText('密码')[0]).toBeInTheDocument()
    expect(screen.getByLabelText('确认密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /注册/i })).toBeInTheDocument()
  })

  it('should update page title on mount', () => {
    renderRegisterPage()
    expect(document.title).toBe('注册 - 咸蛋快板')
  })

  it('should show error when submitting empty form', async () => {
    renderRegisterPage()

    const submitButton = screen.getByRole('button', { name: /注册/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('请填写所有字段')).toBeInTheDocument()
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should show error when passwords do not match', async () => {
    renderRegisterPage()

    const usernameInput = screen.getByLabelText('用户名')
    const emailInput = screen.getByLabelText('邮箱')
    const passwordInputs = screen.getAllByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const submitButton = screen.getByRole('button', { name: /注册/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('两次密码输入不一致')).toBeInTheDocument()
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should show error when password is too short', async () => {
    renderRegisterPage()

    const usernameInput = screen.getByLabelText('用户名')
    const emailInput = screen.getByLabelText('邮箱')
    const passwordInputs = screen.getAllByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const submitButton = screen.getByRole('button', { name: /注册/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInputs[0], { target: { value: '12345' } })
    fireEvent.change(confirmPasswordInput, { target: { value: '12345' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('密码至少需要6个字符')).toBeInTheDocument()
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should call signUp with correct parameters', async () => {
    mockSignUp.mockResolvedValue({ success: true })

    renderRegisterPage()

    const usernameInput = screen.getByLabelText('用户名')
    const emailInput = screen.getByLabelText('邮箱')
    const passwordInputs = screen.getAllByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const submitButton = screen.getByRole('button', { name: /注册/i })

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

    const usernameInput = screen.getByLabelText('用户名')
    const emailInput = screen.getByLabelText('邮箱')
    const passwordInputs = screen.getAllByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const submitButton = screen.getByRole('button', { name: /注册/i })

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
    mockSignUp.mockResolvedValue({ success: false, error: '邮箱已被使用' })

    renderRegisterPage()

    const usernameInput = screen.getByLabelText('用户名')
    const emailInput = screen.getByLabelText('邮箱')
    const passwordInputs = screen.getAllByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const submitButton = screen.getByRole('button', { name: /注册/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('邮箱已被使用')).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should disable submit button while loading', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      signUp: mockSignUp,
      loading: true,
    } as any)

    renderRegisterPage()

    const submitButton = screen.getByRole('button', { name: /注册中/i })
    expect(submitButton).toBeDisabled()
  })

  it('should have link to login page', () => {
    renderRegisterPage()

    const loginLink = screen.getByText('立即登录')
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })
})
