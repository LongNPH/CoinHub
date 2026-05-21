import { useState }          from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { post }              from '../utils/api'

const S = {
  page: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     '#000',
    padding:        '24px 16px',
  },
  box: {
    width:        '100%',
    maxWidth:     380,
    display:      'flex',
    flexDirection:'column',
    gap:          20,
  },
  logoWrap: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
  },
  logoImg:  { width: 32, height: 32, borderRadius: 9 },
  logoText: { fontSize: 18, fontWeight: 500, color: '#fff' },
  card: {
    background:    'rgba(255,255,255,0.03)',
    border:        '1px solid rgba(255,255,255,0.08)',
    borderRadius:  14,
    padding:       '28px 28px',
    display:       'flex',
    flexDirection: 'column',
    gap:           16,
  },
  title: { fontSize: 18, fontWeight: 500, color: '#fff' },
  sub:   { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: -8, lineHeight: 1.6 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  input: {
    padding:      '10px 14px',
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    fontSize:     14,
    color:        '#fff',
    outline:      'none',
    width:        '100%',
  },
  inputFocus: { border: '1px solid rgba(255,255,255,0.3)' },
  btnPrimary: {
    padding:      '11px',
    borderRadius: 8,
    border:       'none',
    background:   '#fff',
    color:        '#000',
    fontSize:     14,
    fontWeight:   500,
    cursor:       'pointer',
    width:        '100%',
  },
  success: {
    padding:      '12px 14px',
    background:   'rgba(0,255,136,0.06)',
    border:       '1px solid rgba(0,255,136,0.15)',
    borderRadius: 8,
    fontSize:     13,
    color:        '#00cc66',
    lineHeight:   1.6,
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

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    try {
      await post('/api/auth/forgot-password', { email: email.trim() })
    } catch {
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.box}>

        {/* Logo */}
        <div style={S.logoWrap}>
          <img src="/favicon.svg" alt="CoinHub" style={S.logoImg} />
          <span style={S.logoText}>CoinHub</span>
        </div>

        <form style={S.card} onSubmit={handleSubmit}>
          <div>
            <div style={S.title}>Quên mật khẩu</div>
            <div style={S.sub}>
              Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu về hộp thư của bạn.
            </div>
          </div>

          {sent ? (
            <div style={S.success}>
              Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.
              Vui lòng kiểm tra hộp thư (kể cả thư mục spam).
            </div>
          ) : (
            <>
              <div style={S.field}>
                <label style={S.label}>Email đã đăng ký</label>
                <input
                  type="email"
                  placeholder="vd: user@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{
                    ...S.input,
                    ...(focused ? S.inputFocus : {}),
                  }}
                  autoComplete="email"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  ...S.btnPrimary,
                  opacity: (loading || !email.trim()) ? 0.5 : 1,
                  cursor:  (loading || !email.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Đang gửi...' : 'Gửi hướng dẫn'}
              </button>
            </>
          )}
        </form>

        <div style={S.footer}>
          <Link to="/login" style={S.link}>Quay lại đăng nhập</Link>
        </div>

      </div>
    </div>
  )
}