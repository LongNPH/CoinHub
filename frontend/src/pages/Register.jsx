import { useState }          from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { post }              from '../utils/api'
import { useAuth }           from '../hooks/useAuth'

const S = {
  page: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'flex-start',
    justifyContent: 'center',
    background:     '#000',
    padding:        '48px 16px 24px',
  },
  box: {
    width:        '100%',
    maxWidth:     440,
    display:      'flex',
    flexDirection:'column',
    gap:          26,
  },
  card: {
    background:    'rgba(255,255,255,0.06)',
    border:        '1px solid rgba(255,255,255,0.12)',
    borderRadius:  14,
    padding:       '32px 32px',
    display:       'flex',
    flexDirection: 'column',
    gap:           16,
  },
  title: { fontSize: 20, fontWeight: 600, color: '#fff', textAlign: 'center', marginBottom: 0 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  input: {
    padding:      '11px 14px',
    background:   'rgba(255,255,255,0.08)',
    border:       '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    fontSize:     14,
    color:        '#fff',
    outline:      'none',
    width:        '100%',
    boxSizing:    'border-box',
  },
  inputFocus: { border: '1px solid rgba(255,255,255,0.3)' },
  inputError: { border: '1px solid rgba(255,68,102,0.4)' },
  fieldError: { fontSize: 12, color: '#ff4466', marginTop: 2 },
  btnPrimary: {
    padding:      '12px',
    borderRadius: 8,
    border:       'none',
    background:   '#fff',
    color:        '#000',
    fontSize:     15,
    fontWeight:   600,
    cursor:       'pointer',
    width:        '100%',
  },
  error: {
    padding:      '10px 14px',
    background:   'rgba(255,68,102,0.08)',
    border:       '1px solid rgba(255,68,102,0.2)',
    borderRadius: 8,
    fontSize:     13,
    color:        '#ff4466',
  },
  footer: {
    textAlign: 'center',
    fontSize:  13,
    color:     'rgba(255,255,255,0.3)',
  },
  link: {
    color:          'rgba(255,255,255,0.6)',
    textDecoration: 'underline',
  },
}

const INITIAL = {
  username: '', email: '', phone: '', password: '', confirmPassword: '',
}

// Validate từng field
function validate(form) {
  const errs = {}
  if (!form.username.trim())
    errs.username = 'Vui lòng nhập tên đăng nhập'
  else if (form.username.length < 3)
    errs.username = 'Tên đăng nhập phải có ít nhất 3 ký tự'
  else if (!/^[a-zA-Z0-9_]+$/.test(form.username))
    errs.username = 'Chỉ dùng chữ, số và dấu gạch dưới'

  if (!form.email.trim())
    errs.email = 'Vui lòng nhập email'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = 'Email không hợp lệ'

  if (!form.phone.trim())
    errs.phone = 'Vui lòng nhập số điện thoại'
  else if (!/^[0-9+]{9,15}$/.test(form.phone.replace(/\s/g, '')))
    errs.phone = 'Số điện thoại không hợp lệ'

  if (!form.password)
    errs.password = 'Vui lòng nhập mật khẩu'
  else if (form.password.length < 8)
    errs.password = 'Mật khẩu phải có ít nhất 8 ký tự'

  if (!form.confirmPassword)
    errs.confirmPassword = 'Vui lòng xác nhận mật khẩu'
  else if (form.password !== form.confirmPassword)
    errs.confirmPassword = 'Mật khẩu xác nhận không khớp'

  return errs
}

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form,    setForm]    = useState(INITIAL)
  const [errs,    setErrs]    = useState({})
  const [apiErr,  setApiErr]  = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev  => ({ ...prev, [name]: value }))
    setErrs(prev  => ({ ...prev, [name]: '' }))
    setApiErr('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errors = validate(form)
    if (Object.keys(errors).length > 0) {
      setErrs(errors)
      return
    }

    setLoading(true)
    setApiErr('')
    try {
      await post('/api/auth/register', {
        username:        form.username.trim(),
        email:           form.email.trim(),
        phone:           form.phone.trim(),
        password:        form.password,
        confirmPassword: form.confirmPassword,
      })
      await login(form.username.trim(), form.password)
      navigate('/')
    } catch (err) {
      setApiErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  function inputStyle(name) {
    return {
      ...S.input,
      ...(focused === name    ? S.inputFocus : {}),
      ...(errs[name]          ? S.inputError : {}),
    }
  }

  return (
    <div style={S.page}>
      <div style={S.box}>

        <form style={S.card} onSubmit={handleSubmit}>
          <div>
            <div style={S.title}>Tạo tài khoản</div>
          </div>

          {apiErr && <div style={S.error}>{apiErr}</div>}

          {/* Username */}
          <div style={S.field}>
            <label style={S.label}>Tên đăng nhập</label>
            <input
              name="username"
              type="text"
              placeholder="Nhập tên đăng nhập"
              value={form.username}
              onChange={handleChange}
              onFocus={() => setFocused('username')}
              onBlur={() => setFocused('')}
              style={inputStyle('username')}
              autoComplete="username"
            />
            {errs.username && <span style={S.fieldError}>{errs.username}</span>}
          </div>

          {/* Phone */}
          <div style={S.field}>
            <label style={S.label}>Số điện thoại</label>
            <input
              name="phone"
              type="tel"
              placeholder="Nhập số điện thoại"
              value={form.phone}
              onChange={handleChange}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused('')}
              style={inputStyle('phone')}
              autoComplete="tel"
            />
            {errs.phone && <span style={S.fieldError}>{errs.phone}</span>}
          </div>

          {/* Email */}
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input
              name="email"
              type="email"
              placeholder="vd: user@gmail.com"
              value={form.email}
              onChange={handleChange}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
              style={inputStyle('email')}
              autoComplete="email"
            />
            {errs.email && <span style={S.fieldError}>{errs.email}</span>}
          </div>

          {/* Password */}
          <div style={S.field}>
            <label style={S.label}>Mật khẩu</label>
            <input
              name="password"
              type="password"
              placeholder="Ít nhất 8 ký tự"
              value={form.password}
              onChange={handleChange}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused('')}
              style={inputStyle('password')}
              autoComplete="new-password"
            />
            {errs.password && <span style={S.fieldError}>{errs.password}</span>}
          </div>

          {/* Confirm Password */}
          <div style={S.field}>
            <label style={S.label}>Xác nhận mật khẩu</label>
            <input
              name="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={form.confirmPassword}
              onChange={handleChange}
              onFocus={() => setFocused('confirmPassword')}
              onBlur={() => setFocused('')}
              style={inputStyle('confirmPassword')}
              autoComplete="new-password"
            />
            {errs.confirmPassword && (
              <span style={S.fieldError}>{errs.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...S.btnPrimary,
              opacity: loading ? 0.6 : 1,
              cursor:  loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
        </form>

        {/* Footer */}
        <div style={S.footer}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={S.link}>Đăng nhập</Link>
        </div>

      </div>
    </div>
  )
}