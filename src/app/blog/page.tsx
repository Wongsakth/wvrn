import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'บทความคอนเสิร์ต | WVRN',
  description: 'รวมบทความ ข่าวสาร และคู่มือคอนเสิร์ตและงานดนตรีในไทย',
}

function getPosts() {
  const postsDir = path.join(process.cwd(), 'src/content/posts')
  if (!fs.existsSync(postsDir)) return []
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'))
  return files
    .map(filename => {
      const raw = fs.readFileSync(path.join(postsDir, filename), 'utf-8')
      const { data } = matter(raw)
      return {
        slug:        filename.replace('.mdx', ''),
        title:       data.title ?? 'ไม่มีชื่อ',
        description: data.description ?? '',
        date:        data.date ?? '',
        tags:        data.tags ?? [],
        cover:       data.cover ?? '',
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export default function BlogPage() {
  const posts = getPosts()

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      {/* Navbar placeholder — ใช้ Navbar component ของ WVRN */}
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-10">

        <div className="mb-8">
          <h1 className="text-[26px] font-medium text-primary mb-1">บทความ</h1>
          <p className="text-[14px] text-muted">ข่าวสาร คู่มือ และบทความคอนเสิร์ตในไทย</p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <p className="text-muted text-[14px]">ยังไม่มีบทความ</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`}
                className="block rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                {post.cover && (
                  <img src={post.cover} alt={post.title}
                    className="w-full h-48 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex gap-2 flex-wrap mb-2">
                    {post.tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-[17px] font-medium text-primary mb-1">{post.title}</h2>
                  {post.description && (
                    <p className="text-[13px] text-muted line-clamp-2">{post.description}</p>
                  )}
                  {post.date && (
                    <p className="text-[11px] text-muted mt-3">
                      {new Date(post.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
