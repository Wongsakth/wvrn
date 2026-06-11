import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { MDXRemote } from 'next-mdx-remote/rsc'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ShareButtons from '@/components/blog/ShareButtons'

interface Props { params: { slug: string } }

function getPost(slug: string) {
  const filePath = path.join(process.cwd(), 'src/content/posts', `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  return { data, content }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost(params.slug)
  if (!post) return { title: 'ไม่พบบทความ | WVRN' }
  const url = `https://www.wvrn.app/blog/${params.slug}`
  return {
    title:       `${post.data.title} | WVRN`,
    description: post.data.description ?? '',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title:       post.data.title,
      description: post.data.description ?? '',
      type:        'article',
      url,
      publishedTime: post.data.date,
      siteName: 'WVRN',
      images: post.data.cover
        ? [{ url: post.data.cover, width: 1200, height: 630 }]
        : [{ url: 'https://www.wvrn.app/logo.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.data.title,
      description: post.data.description ?? '',
      images: post.data.cover ? [post.data.cover] : ['https://www.wvrn.app/logo.png'],
    },
  }
}

export async function generateStaticParams() {
  const postsDir = path.join(process.cwd(), 'src/content/posts')
  if (!fs.existsSync(postsDir)) return []
  return fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => ({ slug: f.replace('.mdx', '') }))
}

export default function BlogPost({ params }: Props) {
  const post = getPost(params.slug)

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <div className="text-center">
          <p className="text-[16px] text-primary mb-4">ไม่พบบทความ</p>
          <Link href="/blog" className="btn-accent text-[13px] py-2 px-5">กลับไปบทความ</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-8">

        <Link href="/blog"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted mb-6 hover:text-primary transition-colors">
          <ChevronLeft size={14} /> กลับไปบทความ
        </Link>

        {post.data.cover && (
          <img src={post.data.cover} alt={post.data.title}
            className="w-full h-64 object-cover rounded-2xl mb-6" />
        )}

        <div className="flex gap-2 flex-wrap mb-3">
          {(post.data.tags ?? []).map((tag: string) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-[26px] font-medium text-primary mb-2 leading-tight">{post.data.title}</h1>

        {post.data.date && (
          <p className="text-[12px] text-muted mb-4">
            {new Date(post.data.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}

        <div className="mb-8">
          <ShareButtons title={post.data.title} slug={params.slug} />
        </div>

        {/* MDX Content */}
        <article className="prose prose-sm max-w-none"
          style={{
            color: 'var(--text-primary)',
            lineHeight: 1.8,
          }}>
          <MDXRemote source={post.content} />
        </article>

        {/* Footer */}
        <div className="mt-12 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="mb-5">
            <ShareButtons title={post.data.title} slug={params.slug} />
          </div>
          <p className="text-[13px] text-muted mb-3">อ่านบทความเพิ่มเติม</p>
          <Link href="/blog" className="btn-accent text-[13px] py-2 px-5">ดูบทความทั้งหมด</Link>
        </div>

      </div>
    </div>
  )
}
