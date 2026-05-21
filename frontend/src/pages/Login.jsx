import { useState }     from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth }      from '../hooks/useAuth'

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
    background:   'rgba(255,255,255,0.06)',
    border:       '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding:      '32px 32px',
    display:      'flex',
    flexDirection:'column',
    gap:          16,
  },
  title: {
    fontSize:    20,
    fontWeight:  600,
    color:       '#fff',
    marginBottom:0,
    textAlign:   'center',
  },
  field: {
    display:       'flex',
    flexDirection: 'column',
    gap:           6,
  },
  label: {
    fontSize: 12,
    color:    'rgba(255,255,255,0.6)',
  },
  input: {
    padding:      '11px 14px',
    background:   'rgba(255,255,255,0.08)',
    border:       '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    fontSize:     14,
    color:        '#fff',
    outline:      'none',
    width:        '100%',
  },
  inputFocus: {
    border: '1px solid rgba(255,255,255,0.3)',
  },
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
  divider: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
    color:      'rgba(255,255,255,0.15)',
    fontSize:   12,
  },
  divLine: {
    flex:       1,
    height:     1,
    background: 'rgba(255,255,255,0.08)',
  },
  socialRow: {
    display: 'flex',
    flexDirection: 'column',
    gap:     10,
  },
  socialBtn: {
    flex:         1,
    padding:      '10px 0',
    borderRadius: 8,
    border:       '1px solid rgba(255,255,255,0.14)',
    background:   'rgba(255,255,255,0.06)',
    color:        'rgba(255,255,255,0.75)',
    fontSize:     13,
    cursor:       'pointer',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    gap:          6,
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
    cursor:         'pointer',
  },
}

// SVG icons cho social buttons
function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

export default function Login() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.box}>

        {/* Card */}
        <form style={S.card} onSubmit={handleSubmit}>
          <div>
            <div style={S.title}>Đăng nhập</div>
          </div>

          {error && <div style={S.error}>{error}</div>}

          {/* Username */}
          <div style={S.field}>
            <label style={S.label}>Tên đăng nhập hoặc email</label>
            <input
              name="username"
              type="text"
              placeholder="Nhập tên đăng nhập"
              value={form.username}
              onChange={handleChange}
              onFocus={() => setFocused('username')}
              onBlur={() => setFocused('')}
              style={{
                ...S.input,
                ...(focused === 'username' ? S.inputFocus : {}),
              }}
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div style={S.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={S.label}>Mật khẩu</label>
              <Link
                to="/forgot"
                style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)',
                         textDecoration: 'none' }}
              >
                Quên mật khẩu?
              </Link>
            </div>
            <input
              name="password"
              type="password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={handleChange}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused('')}
              style={{
                ...S.input,
                ...(focused === 'password' ? S.inputFocus : {}),
              }}
              autoComplete="current-password"
            />
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
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          {/* Divider */}
          <div style={S.divider}>
            <div style={S.divLine} />
            <span>hoặc đăng nhập với</span>
            <div style={S.divLine} />
          </div>

          {/* Social buttons — tượng trưng, không xử lí */}
          <div style={S.socialRow}>
            <button
              type="button"
              style={S.socialBtn}
              onClick={() => {}}
              title="Đăng nhập với Google"
            >
              <GoogleIcon /> Google
            </button>
            <button
              type="button"
              style={S.socialBtn}
              onClick={() => {}}
              title="Đăng nhập với Facebook"
            >
              <FacebookIcon /> Facebook
            </button>
            <button
              type="button"
              style={S.socialBtn}
              onClick={() => {}}
              title="Đăng nhập với GitHub"
            >
              <GithubIcon /> GitHub
            </button>
          </div>
        </form>

        {/* Footer */}
        <div style={S.footer}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={S.link}>Đăng ký ngay</Link>
        </div>

      </div>
    </div>
  )
}