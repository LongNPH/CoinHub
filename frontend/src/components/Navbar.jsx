import { useContext, useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { get, post } from '../utils/api'
import { formatPrice } from '../utils/formatters'
import { SocketContext } from '../context/SocketContext'

const NAV_LINKS = [
  { to: '/',        label: 'Trang chủ', authOnly: false, adminOnly: false },
  { to: '/trade',   label: 'Giao dịch', authOnly: false, adminOnly: false },
  { to: '/history', label: 'Lịch sử',   authOnly: true,  adminOnly: false },
  { to: '/news',    label: 'Tin tức',   authOnly: false, adminOnly: false },
  { to: '/admin',   label: 'Hiệu năng', authOnly: true,  adminOnly: true  },
]

export default function Navbar() {
  const { user, isAdmin, logout, loading } = useAuth()
  const navigate = useNavigate()
  const socket = useContext(SocketContext)

  const [balance, setBalance] = useState(null)
  const [unit, setUnit]       = useState('USD')
  const [loginHover, setLoginHover] = useState(false)
  const [registerHover, setRegisterHover] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationHover, setNotificationHover] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setBalance(null)
      setUnit('USD')
      setNotifications([])
      setNotificationUnreadCount(0)
      return
    }
    fetchBalance()
  }, [user])

  useEffect(() => {
    function onBalanceUpdated() {
      fetchBalance()
    }

    window.addEventListener('coinhub:balance-updated', onBalanceUpdated)
    return () => window.removeEventListener('coinhub:balance-updated', onBalanceUpdated)
  }, [user])

  useEffect(() => {
    if (!user) return

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (!socket || !user) return

    socket.emit('join_user', user.id)

    function onNotification(item) {
      setNotifications(prev => [item, ...prev.filter(n => n.id !== item.id)].slice(0, 10))
      setNotificationUnreadCount(prev => prev + 1)
    }

    socket.on('notification', onNotification)
    return () => socket.off('notification', onNotification)
  }, [socket, user])

  async function fetchNotifications() {
    if (!user) return
    setNotificationsLoading(true)
    try {
      const data = await get('/api/notifications')
      if (Array.isArray(data)) {
        setNotifications(data.slice(0, 10))
        setNotificationUnreadCount(data.length)
      } else {
        setNotifications(Array.isArray(data.items) ? data.items.slice(0, 10) : [])
        setNotificationUnreadCount(Number(data.unread_count) || 0)
      }
    } catch {
      setNotifications([])
      setNotificationUnreadCount(0)
    } finally {
      setNotificationsLoading(false)
    }
  }

  function fetchBalance() {
    if (!user) return
    get('/api/trade/balance')
      .then(data => setBalance(data))
      .catch(() => setBalance(null))
  }

  function refreshNavbarData() {
    fetchBalance()
    fetchNotifications()
  }

  function displayBalance() {
    if (!balance) return '...'
    if (unit === 'USD') {
      return formatPrice(balance.usd)
    }
    const holding = balance.holdings?.find(h => h.symbol === unit)
    if (!holding) {
      return '0.0000 ' + unit
    }
    const quantity = Number(holding.quantity)
    return quantity.toFixed(4)
  }

  const unitOptions = ['USD']
  if (balance && balance.holdings) {
    for (let i = 0; i < balance.holdings.length; i++) {
      unitOptions.push(balance.holdings[i].symbol)
    }
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  function formatNotificationTime(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })
  }

  async function markNotificationsRead() {
    setNotificationUnreadCount(0)
    try {
      await post('/api/notifications/read', {})
    } catch {}
  }

  const navBarStyle = {
    background: '#2a2a2a',
    borderBottom: '1px solid #444444',
    backdropFilter: 'blur(12px)',
    height: 80,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 40,
    paddingRight: 25,
    flexShrink: 0,
    gap: 0,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  }

  const logoContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    marginRight: 120,
    cursor: 'pointer',
    textDecoration: 'none',
  }

  const logoImageStyle = {
    width: 52,
    height: 52,
    borderRadius: '50%',
  }

  const logoTextStyle = {
    fontFamily: 'montserrat, sans-serif',
    fontSize: 24,
    fontWeight: 700,
    color: '#12ad6f',
    letterSpacing: '1px',
    fontStyle: 'italic',
    textShadow: '0 2px 8px rgba(6, 88, 55, 0.3)',
  }

  const navLinksContainerStyle = {
    display: 'flex',
    gap: 70,
    flex: 0,
    justifyContent: 'left',
    whiteSpace: 'nowrap',
  }

  const navLinkBaseStyle = {
    padding: '10px 0px',
    borderRadius: 0,
    fontSize: 19,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    border: 'none',
    transition: 'all 0.2s',
    color: '#ffffff',
  }

  const navLinkActiveStyle = {
    ...navLinkBaseStyle,
    color: '#ffffff',
  }

  const navLinkInactiveStyle = {
    ...navLinkBaseStyle,
    color: '#ffffff',
  }

  const adminLinkActiveStyle = {
    ...navLinkBaseStyle,
    color: '#ffffff',
  }

  const adminLinkInactiveStyle = {
    ...navLinkBaseStyle,
    color: '#ffffff',
  }

  const chipStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'transparent',
    border: 'none',
    borderRadius: 10,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
  }

  const notificationWrapStyle = {
    position: 'relative',
    marginLeft: 'auto',
    marginRight: 20,
  }

  const notificationButtonStyle = {
    width: 50,
    height: 50,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.12)',
    background: showNotifications || notificationHover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s',
  }

  const notificationBadgeStyle = {
    position: 'absolute',
    top: 12,
    right: 13,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#12ad6f',
    border: '1px solid #2a2a2a',
  }

  const notificationPanelStyle = {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: 12,
    width: 380,
    minHeight: 500,
    background: '#151515',
    border: '3px solid rgba(17, 48, 34, 0.9)',
    borderRadius: 12,
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.55)',
    zIndex: 1000,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  const notificationEmptyStyle = {
    padding: '28px 34px',
    fontSize: 14,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
    maxWidth: 340,
  }

  const notificationListStyle = {
    width: '100%',
    maxHeight: 500,
    overflowY: 'auto',
    padding: '10px 0',
  }

  const notificationItemStyle = {
    padding: '13px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  }

  const notificationTitleStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
  }

  const notificationMetaStyle = {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 12,
    lineHeight: 1.5,
  }

  const walletAmountStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#ffffff',
    fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif',
    lineHeight: '1',
    letterSpacing: '-0.3px',
  }

  const walletSelectStyle = {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif',
    cursor: 'pointer',
    outline: 'none',
    lineHeight: '1',
    padding: '0 2px',
  }

  const userNameStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#ffffff',
  }

  const avatarStyle = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#444444',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
  }

  const loginButtonStyle = {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: 600,
    background: '#ffffff',
    border: 'none',
    borderRadius: 6,
    color: '#000000',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.15)',
  }

  const registerButtonStyle = {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: 600,
    background: '#065837',
    border: 'none',
    borderRadius: 6,
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(6, 88, 55, 0.3)',
  }

  const authButtonsContainerStyle = {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginLeft: 'auto',
  }

  const dividerStyle = {
    width: '1px',
    height: '24px',
    background: '#555555',
    margin: '0px 16px',
  }

  const profileButtonStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: 8,
    transition: 'all 0.2s',
    position: 'relative',
  }

  const profileMenuStyle = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    background: '#1a1a1a',
    border: '1px solid #333333',
    borderRadius: 8,
    width: '100%',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    overflow: 'hidden',
  }

  const profileMenuItemStyle = {
    padding: '12px 16px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s',
    borderBottom: '1px solid #222222',
    userSelect: 'none',
  }

  const profileMenuLogoutStyle = {
    ...profileMenuItemStyle,
    borderBottom: 'none',
    color: '#ff4466',
  }

  return (
    <nav style={navBarStyle}>
      <div onClick={() => { refreshNavbarData(); navigate('/') }} style={logoContainerStyle}>
        <img
          src="/favicon.svg"
          alt="CoinHub logo"
          style={logoImageStyle}
        />
        <span style={logoTextStyle}>CoinHub</span>
      </div>

      <div style={navLinksContainerStyle}>
        {NAV_LINKS.map((link) => {
          const getLinkStyle = (isActive) => {
            if (link.adminOnly) {
              if (isActive) {
                return adminLinkActiveStyle
              } else {
                return adminLinkInactiveStyle
              }
            } else {
              if (isActive) {
                return navLinkActiveStyle
              } else {
                return navLinkInactiveStyle
              }
            }
          }

          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={refreshNavbarData}
              style={({ isActive }) => getLinkStyle(isActive)}
            >
              {link.label}
            </NavLink>
          )
        })}
      </div>

      {!loading && user && (
        <>
        <div style={notificationWrapStyle}>
          <button
            type="button"
            aria-label="Thông báo"
            title="Thông báo"
            onClick={() => {
              const next = !showNotifications
              setShowNotifications(next)
              if (next) {
                fetchNotifications()
                markNotificationsRead()
              }
            }}
            onBlur={() => setTimeout(() => setShowNotifications(false), 100)}
            onMouseEnter={() => setNotificationHover(true)}
            onMouseLeave={() => setNotificationHover(false)}
            style={notificationButtonStyle}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
                stroke="rgba(255,255,255,0.72)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke="rgba(255,255,255,0.72)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {notificationUnreadCount > 0 && <span style={notificationBadgeStyle} />}
          </button>

          {showNotifications && (
            <div style={notificationPanelStyle}>
              <div style={{ ...notificationEmptyStyle, display: notifications.length > 0 ? 'none' : 'block' }}>
                Chưa có thông báo mới. Các cảnh báo theo dõi coin sẽ xuất hiện ở đây.
              </div>
              {notifications.length > 0 && (
                <div style={notificationListStyle}>
                  {notifications.map(item => {
                    const isBuy = item.alert_type === 'buy'
                    return (
                      <div key={item.id} style={notificationItemStyle}>
                        <div style={notificationTitleStyle}>
                          <span>
                            {item.symbol} {isBuy ? 'đạt giá mua' : 'đạt giá bán'}
                          </span>
                          <span style={{ color: isBuy ? '#00ff88' : '#ff4466' }}>
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        <div style={notificationMetaStyle}>
                          {isBuy
                            ? 'Ask đã chạm ngưỡng cảnh báo mua.'
                            : 'Bid đã chạm ngưỡng cảnh báo bán.'
                          }
                        </div>
                        <div style={{ ...notificationMetaStyle, color: 'rgba(255,255,255,0.32)' }}>
                          {formatNotificationTime(item.sent_at)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ ...chipStyle, marginLeft: 0, marginRight: 0 }}>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: -1 }}>
            <rect x="1" y="3" width="12" height="9" rx="2"
                  stroke="rgba(255,255,255,0.3)" strokeWidth="1.2"/>
            <path d="M1 6h12" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2"/>
            <circle cx="10" cy="9" r="1" fill="rgba(255,255,255,0.3)"/>
          </svg>

          <span style={walletAmountStyle}>
            {displayBalance()}
          </span>

          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={walletSelectStyle}
          >
            {unitOptions.map((u) => (
              <option key={u} value={u} style={{ background: '#111', color: '#fff' }}>
                {u}
              </option>
            ))}
          </select>
        </div>
        </>
      )}

      {loading ? (
        <div style={{ marginLeft: 'auto', width: 220, height: 40 }} />
      ) : user ? (
        <div style={{ position: 'relative', marginLeft: 12 }}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            onBlur={() => setTimeout(() => setShowProfileMenu(false), 100)}
            style={{
              ...profileButtonStyle,
              background: showProfileMenu ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
              borderColor: showProfileMenu ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)',
            }}
          >
            <div style={avatarStyle}>
              {user.username && user.username.length > 0 ? user.username[0].toUpperCase() : '?'}
            </div>
            <span style={userNameStyle}>{user.username || 'User'}</span>
          </button>

          {showProfileMenu && (
            <div style={profileMenuStyle}>
              <div
                style={profileMenuLogoutStyle}
                onClick={() => {
                  setShowProfileMenu(false)
                  handleLogout()
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,68,102,0.15)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Đăng xuất
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={authButtonsContainerStyle}>
          <button
            onClick={() => navigate('/login')}
            style={{
              ...loginButtonStyle,
              background: loginHover ? '#f0f0f0' : '#ffffff',
              transform: loginHover ? 'scale(1.05)' : 'scale(1)',
              boxShadow: loginHover ? '0 6px 20px rgba(255, 255, 255, 0.25)' : '0 4px 12px rgba(255, 255, 255, 0.15)',
            }}
            onMouseEnter={() => setLoginHover(true)}
            onMouseLeave={() => setLoginHover(false)}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              ...registerButtonStyle,
              background: registerHover ? '#054a30' : '#065837',
              transform: registerHover ? 'scale(1.05)' : 'scale(1)',
              boxShadow: registerHover ? '0 6px 20px rgba(6, 88, 55, 0.5)' : '0 4px 12px rgba(6, 88, 55, 0.3)',
            }}
            onMouseEnter={() => setRegisterHover(true)}
            onMouseLeave={() => setRegisterHover(false)}
          >
            Đăng ký
          </button>
        </div>
      )}
    </nav>
  )
}
