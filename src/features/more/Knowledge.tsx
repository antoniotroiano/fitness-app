import { Fragment, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Card, Page, inputCls } from '../../components/ui'
import { Icon } from '../../components/icons'
import { findArticle, searchArticles, type HelpBlock } from '../../data/help'
import { CATS, INTRO } from '../../data/helpLang'
import { t } from '../../i18n'

const APP_NAME = 'TRAINRATE: WORKOUT'

/** `**fett**` im Text als Hervorhebung (Bedienelemente und Menünamen). */
function Rich({ text }: { text: string }) {
  return <>{text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i} className="font-semibold">{part}</strong> : <Fragment key={i}>{part}</Fragment>))}</>
}

function ArticleRow({ id, title, sub }: { id: string; title: string; sub?: string }) {
  const nav = useNavigate()
  return (
    <button onClick={() => nav(`/more/help/a/${id}`)} className="w-full flex items-center gap-3 py-3.5 text-left">
      <span className="flex-1 min-w-0"><span className="block text-sm font-medium">{title}</span>{sub && <span className="block text-xs text-muted">{sub}</span>}</span>
      <span className="text-muted">›</span>
    </button>
  )
}

/** Wissensdatenbank: Startseite mit App-Name, Einleitung, Suche und den Kategorien. */
export function KnowledgeBasePage() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const hits = searchArticles(q.trim(), CATS)
  return (
    <Page title={t('Wissensdatenbank')} back={() => nav('/more')}>
      <div className="px-1 pt-2 space-y-1.5">
        <div className="flex items-center gap-2 text-accent"><Icon name="guide" size={26} /><span className="text-xl font-bold text-fg">{APP_NAME}</span></div>
        <p className="text-sm text-muted">{INTRO}</p>
      </div>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Artikel durchsuchen')} aria-label={t('Artikel durchsuchen')} className={inputCls} />
      {q.trim() ? (
        hits.length ? (
          <Card className="divide-y divide-line !py-1">
            {hits.map(({ cat, article }) => <ArticleRow key={article.id} id={article.id} title={article.title} sub={cat.title} />)}
          </Card>
        ) : <p className="text-sm text-muted text-center py-6">{t('Keine Artikel gefunden.')}</p>
      ) : (
        <div className="space-y-3">
          {CATS.map((c) => (
            <button key={c.id} onClick={() => nav(`/more/help/c/${c.id}`)}
              className="w-full flex items-center gap-4 rounded-2xl bg-surface border border-line p-4 text-left active:opacity-70">
              <span className="shrink-0 w-11 h-11 rounded-xl bg-surface2 flex items-center justify-center"><Icon name={c.icon} size={24} /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{c.title}</span>
                <span className="block text-xs text-muted">{c.desc}</span>
                <span className="block text-xs text-muted mt-0.5">{c.articles.length === 1 ? t('1 Artikel') : t('{0} Artikel', c.articles.length)}</span>
              </span>
              <span className="text-muted">›</span>
            </button>
          ))}
        </div>
      )}
    </Page>
  )
}

export function HelpCategoryPage() {
  const nav = useNavigate()
  const { cat } = useParams()
  const c = CATS.find((x) => x.id === cat)
  if (!c) return <Page title={t('Wissensdatenbank')} back={() => nav('/more/help')}><p className="text-sm text-muted">{t('Kategorie nicht gefunden.')}</p></Page>
  return (
    <Page title={c.title} back={() => nav('/more/help')}>
      <p className="text-sm text-muted px-1">{c.desc}</p>
      <Card className="divide-y divide-line !py-1">
        {c.articles.map((a) => <ArticleRow key={a.id} id={a.id} title={a.title} />)}
      </Card>
    </Page>
  )
}

function Block({ b }: { b: HelpBlock }) {
  if (typeof b === 'string') return <p className="text-sm leading-relaxed"><Rich text={b} /></p>
  if (Array.isArray(b)) return <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">{b.map((x, i) => <li key={i}><Rich text={x} /></li>)}</ul>
  return <ol className="text-sm leading-relaxed space-y-2">{b.steps.map((x, i) => (
    <li key={i} className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-surface2 text-xs font-semibold flex items-center justify-center">{i + 1}</span><span className="flex-1"><Rich text={x} /></span></li>
  ))}</ol>
}

export function HelpArticlePage() {
  const nav = useNavigate()
  const loc = useLocation()
  const { id } = useParams()
  const helpBack = (loc.state as { helpBack?: string } | null)?.helpBack
  const found = id ? findArticle(id, CATS) : undefined
  if (!found) return <Page title={t('Wissensdatenbank')} back={() => nav('/more/help')}><p className="text-sm text-muted">{t('Artikel nicht gefunden.')}</p></Page>
  const { cat, article } = found
  const related = (article.related ?? []).map((r) => findArticle(r, CATS)).filter((x) => !!x)
  return (
    <Page title={cat.title} back={() => nav(helpBack ?? `/more/help/c/${cat.id}`)}>
      <h2 className="text-xl font-bold px-1">{article.title}</h2>
      <Card className="space-y-3">{article.blocks.map((b, i) => <Block key={i} b={b} />)}</Card>
      {related.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted px-1">{t('Verwandte Artikel')}</h3>
          <Card className="divide-y divide-line !py-1">
            {related.map((r) => <ArticleRow key={r!.article.id} id={r!.article.id} title={r!.article.title} />)}
          </Card>
        </section>
      )}
    </Page>
  )
}
