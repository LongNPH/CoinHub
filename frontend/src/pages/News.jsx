import { useEffect, useMemo, useState } from 'react'
import { get } from '../utils/api'

const ARTICLES_PER_PAGE = 6
const PAGE_COUNT = 5

const S = {
  page: {
    flex: 1,
    minHeight: 0,
    background: '#000',
    color: '#fff',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  topBar: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#12ad6f',
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1.1,
    color: '#fff',
    margin: 0,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 1.7,
    color: 'rgba(255,255,255,0.56)',
    maxWidth: 620,
  },
  refreshBtn: {
    padding: '9px 13px',
    borderRadius: 8,
    border: '1px solid rgba(18,173,111,0.35)',
    background: 'rgba(18,173,111,0.1)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.15fr 0.85fr',
    gap: 14,
    minHeight: 0,
  },
  feature: {
    minHeight: 416,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
    background: '#111',
    position: 'relative',
    textDecoration: 'none',
    color: '#fff',
    display: 'flex',
    alignItems: 'flex-end',
  },
  featureOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.45) 44%, rgba(0,0,0,0.92) 100%)',
  },
  featureContent: {
    position: 'relative',
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sourceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    flexWrap: 'wrap',
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: 500,
  },
  sourceDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#12ad6f',
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: 31,
    lineHeight: 1.18,
    fontWeight: 700,
    maxWidth: 720,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: 'rgba(255,255,255,0.72)',
    maxWidth: 760,
  },
  sideList: {
    display: 'grid',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: 14,
  },
  articleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },
  card: {
    minHeight: 230,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.035)',
    overflow: 'hidden',
    color: '#fff',
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    transition: 'border-color .16s ease, background .16s ease, transform .16s ease',
  },
  smallCard: {
    minHeight: 0,
    display: 'grid',
    gridTemplateColumns: '132px 1fr',
  },
  image: {
    width: '100%',
    height: 118,
    objectFit: 'cover',
    background: '#151515',
    flexShrink: 0,
  },
  smallImage: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    objectFit: 'cover',
    background: '#151515',
  },
  imageFallback: {
    background: 'linear-gradient(135deg, #101010 0%, #1f2f27 48%, #062f1f 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.28)',
    fontSize: 13,
    fontWeight: 700,
  },
  cardBody: {
    padding: 15,
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 1.35,
    fontWeight: 650,
    color: '#fff',
  },
  smallTitle: {
    fontSize: 14,
    lineHeight: 1.42,
    fontWeight: 650,
    color: '#fff',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.55)',
    flex: 1,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 2,
  },
  pageBtn: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.64)',
    cursor: 'pointer',
    fontWeight: 600,
  },
  pageBtnActive: {
    background: '#fff',
    color: '#000',
    border: '1px solid #fff',
  },
  status: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.64)',
    fontSize: 14,
  },
  errorBox: {
    maxWidth: 460,
    padding: 18,
    borderRadius: 12,
    border: '1px solid rgba(255,68,102,0.22)',
    background: 'rgba(255,68,102,0.08)',
    color: '#ff6b86',
    lineHeight: 1.6,
    textAlign: 'center',
  },
}

function normalizeArticles(payload) {
  const raw = Array.isArray(payload) ? payload : payload?.items ?? payload?.data ?? payload?.news ?? []
  return raw.slice(0, ARTICLES_PER_PAGE * PAGE_COUNT).map((item, index) => {
    const source = item.news_site || item.source || item.site || item.author || 'CoinGecko'
    const createdAt = item.created_at || item.published_at || item.updated_at || item.date
    return {
      id: item.id || item.url || `${source}-${createdAt || index}`,
      title: decodeText(item.title || item.name || 'Tin tức thị trường'),
      description: decodeText(item.description || item.summary || item.text || ''),
      url: item.url || item.link || '#',
      image: item.thumb_2x || item.thumb || item.image || item.image_url || item.urlToImage || '',
      source,
      createdAt,
    }
  })
}

function decodeText(text) {
  if (!text) return ''
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function formatNewsDate(value) {
  if (!value) return 'Vừa cập nhật'
  const date = new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value)
  if (Number.isNaN(date.getTime())) return 'Vừa cập nhật'
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

function getHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function ImageBlock({ article, small = false }) {
  if (article.image) {
    return (
      <img
        src={article.image}
        alt={article.title}
        style={small ? S.smallImage : S.image}
        loading="lazy"
      />
    )
  }

  return (
    <div style={{
      ...(small ? S.smallImage : S.image),
      ...S.imageFallback,
      height: small ? '100%' : S.image.height,
    }}>
      {article.source.slice(0, 10)}
    </div>
  )
}

function ArticleMeta({ article }) {
  const host = getHost(article.url)
  return (
    <div style={S.sourceRow}>
      <span style={S.sourceDot} />
      <span>{article.source}</span>
      <span style={{ color: 'rgba(255,255,255,0.24)' }}>•</span>
      <span>{formatNewsDate(article.createdAt)}</span>
      {host && (
        <>
          <span style={{ color: 'rgba(255,255,255,0.24)' }}>•</span>
          <span>{host}</span>
        </>
      )}
    </div>
  )
}

function ArticleCard({ article, small = false }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      style={{ ...S.card, ...(small ? S.smallCard : {}) }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(18,173,111,0.42)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.055)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.035)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <ImageBlock article={article} small={small} />
      <div style={S.cardBody}>
        <ArticleMeta article={article} />
        <div style={small ? S.smallTitle : S.cardTitle}>{article.title}</div>
        {!small && article.description && (
          <div style={S.cardDesc}>{article.description}</div>
        )}
      </div>
    </a>
  )
}

function FeaturedArticle({ article }) {
  if (!article) return null

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      style={{
        ...S.feature,
        backgroundImage: article.image
          ? `url("${article.image}")`
          : 'linear-gradient(135deg, #101010 0%, #173b2d 50%, #02180f 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div style={S.featureOverlay} />
      <div style={S.featureContent}>
        <ArticleMeta article={article} />
        <div style={S.featureTitle}>{article.title}</div>
        {article.description && <div style={S.featureText}>{article.description}</div>}
      </div>
    </a>
  )
}

export default function News() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  async function loadNews() {
    setLoading(true)
    setError('')
    try {
      const data = await get('/api/coins/news')
      setArticles(normalizeArticles(data))
      setPage(1)
    } catch (err) {
      setError(err.message || 'Không tải được tin tức')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNews()
  }, [])

  const pageArticles = useMemo(() => {
    const start = (page - 1) * ARTICLES_PER_PAGE
    return articles.slice(start, start + ARTICLES_PER_PAGE)
  }, [articles, page])

  const featured = pageArticles[0]
  const sideArticles = pageArticles.slice(1, 4)
  const lowerArticles = pageArticles.slice(4)

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.status}>Đang tải tin tức thị trường...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={S.page}>
        <div style={S.status}>
          <div style={S.errorBox}>
            <div>{error}</div>
            <button onClick={loadNews} style={{ ...S.refreshBtn, marginTop: 14 }}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main style={S.page}>
      <div style={S.topBar}>
        <div>
          <div style={S.eyebrow}>CoinHub News</div>
          <h1 style={S.title}>Tin tức thị trường</h1>
        </div>
      </div>

      {articles.length === 0 ? (
        <div style={S.status}>Chưa có tin tức để hiển thị.</div>
      ) : (
        <>
          <section style={S.grid}>
            <FeaturedArticle article={featured} />
            <div style={S.sideList}>
              {sideArticles.map(article => (
                <ArticleCard key={article.id} article={article} small />
              ))}
            </div>
          </section>

          {lowerArticles.length > 0 && (
            <section style={{
              ...S.articleGrid,
              gridTemplateColumns: `repeat(${lowerArticles.length}, 1fr)`,
            }}>
              {lowerArticles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </section>
          )}

          <div style={S.pagination}>
            <button
              style={S.pageBtn}
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
            >
              ‹
            </button>

            {Array.from({ length: PAGE_COUNT }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => setPage(num)}
                style={{
                  ...S.pageBtn,
                  ...(page === num ? S.pageBtnActive : {}),
                }}
              >
                {num}
              </button>
            ))}

            <button
              style={S.pageBtn}
              disabled={page === PAGE_COUNT}
              onClick={() => setPage(prev => Math.min(PAGE_COUNT, prev + 1))}
            >
              ›
            </button>
          </div>
        </>
      )}
    </main>
  )
}
