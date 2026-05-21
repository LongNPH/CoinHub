export function formatPrice(n) {
  if (n == null) return '—'
  return '$' + Number(n).toLocaleString('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatPercent(n) {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : ''
  return sign + Number(n).toFixed(2) + '%'
}

export function formatVolume(n) {
  if (!n) return '—'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T'
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(1)  + 'B'
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(1)  + 'M'
  if (n >= 1e3)  return '$' + (n / 1e3).toFixed(1)  + 'K'
  return '$' + Number(n).toLocaleString('en')
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('vi-VN')
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString('vi-VN')
}