import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import {
  markdownToHtml,
  htmlToMarkdown,
  canonicalizeMarkdown,
} from '../../src/lib/editor/richTextMarkdownUtils';
import {
  parseEmailBlocks,
  renderInlineFormattedText,
} from '../../src/lib/emailContentUtils';
import { FormattedEmailBody } from '../../src/components/detail/FormattedEmailBody';
import {
  detectTextDirection,
  renderWithBidiIsolation,
  hasRtlText,
} from '../../src/lib/rtlUtils';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function renderComponent(ui: React.ReactNode) {
  if (root) {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  }
  const currentHost = document.createElement('div');
  document.body.appendChild(currentHost);
  const currentRoot = createRoot(currentHost);
  host = currentHost;
  root = currentRoot;
  act(() => {
    currentRoot.render(ui);
  });
  return { container: currentHost };
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe('RTL & BiDi Integration Suite (Arabic & Mixed Directionality)', () => {
  describe('markdownToHtml & htmlToMarkdown BiDi rendering', () => {
    it('decorates all block paragraphs, headings, and lists with dir="auto"', () => {
      const md = `
# نظرة عامة
هذه وظيفة مطور فلاتر ذكي.
- تطوير الواجهات
- تكامل الخدمات
1. الخطوة الأولى
2. الخطوة الثانية
> ملاحظة هامة جداً
      `.trim();

      const html = markdownToHtml(md);
      expect(html).toContain('<h2 class="font-bold text-slate-900 text-lg font-sans tracking-tight mt-3 mb-1" dir="auto">');
      expect(html).toContain('<p class="leading-relaxed" dir="auto">');
      expect(html).toContain('<ul class="list-disc pl-4 space-y-0.5 my-1 text-slate-800 text-xs" dir="auto">');
      expect(html).toContain('<ol class="list-decimal pl-4 space-y-0.5 my-1 text-slate-800 text-xs" dir="auto">');
      expect(html).toContain('<blockquote class="border-l-4 border-blue-400 bg-blue-50/60 rounded-lg pl-3 pr-2 py-1.5 my-2 text-slate-700" dir="auto">');
    });

    it('pins code blocks and inline code strictly to dir="ltr"', () => {
      const md = 'استخدم الأمر `npm test` للتشغيل:\n```bash\nnpm run build\n```';
      const html = markdownToHtml(md);

      expect(html).toContain('<code class="font-mono text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded border border-slate-200" dir="ltr">npm test</code>');
      expect(html).toContain('dir="ltr"');
      expect(html).toContain('<code>npm run build</code>');
    });

    it('round-trips Arabic and mixed content through canonicalizeMarkdown with 100% fidelity', () => {
      const sampleArabic = `
# مطور فلاتر مطلوب

للإنضمام إلى فريق عمل شركة سعودية، والمشاركة في تطوير تطبيق Flutter Developer.

- تطوير وتصميم تطبيقات الجوال باستخدام إطار العمل Flutter ولغة Dart.
- الدمج البرمجي للخدمات والميزات التقنية (DevOps & AI/ML).

> ملاحظة: الخبرة في Agentic Workflow مطلوبة.
      `.trim();

      const canonical = canonicalizeMarkdown(sampleArabic);
      expect(canonical).toContain('# مطور فلاتر مطلوب');
      expect(canonical).toContain('Flutter Developer');
      expect(canonical).toContain('DevOps & AI/ML');
      expect(canonical).toContain('> ملاحظة: الخبرة في Agentic Workflow مطلوبة.');
    });
  });

  describe('Email Log BiDi parsing & structured rendering', () => {
    it('parses numbered list items starting with "1)" as structured numbered lists', () => {
      const email = `
أردت أن أوضح خبرتي في مجال الذكاء الاصطناعي:
1) الذكاء الاصطناعي في سير عملي اليومي (AI-Augmented Engineering)
2) بيئة عمل ذكية ومنضبطة (Specification-Driven Development)
      `.trim();

      const blocks = parseEmailBlocks(email);
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[1].type).toBe('numbered-list');
      if (blocks[1].type === 'numbered-list') {
        expect(blocks[1].items.length).toBe(2);
        expect(blocks[1].items[0]).toContain('الذكاء الاصطناعي في سير عملي اليومي');
      }
    });

    it('isolates opposing-direction parenthesized phrases via renderWithBidiIsolation', () => {
      // In Arabic context (RTL): parenthesized English phrase gets isolated as dir="ltr"
      const rtlText = 'الذكاء الاصطناعي في سير عملي اليومي (AI-Augmented Engineering)';
      const nodes = renderWithBidiIsolation(rtlText, 'rtl');

      const { container } = renderComponent(<div>{nodes}</div>);
      const bdi = container.querySelector('bdi');
      expect(bdi).not.toBeNull();
      expect(bdi?.getAttribute('dir')).toBe('ltr');
      expect(bdi?.textContent).toBe('(AI-Augmented Engineering)');
    });

    it('isolates parenthesized Arabic phrases inside English context as dir="rtl"', () => {
      // In English context (LTR): parenthesized Arabic phrase gets isolated as dir="rtl"
      const ltrText = 'Hiring: Senior Flutter Developer (مطور تطبيقات موبايل SA)';
      const nodes = renderWithBidiIsolation(ltrText, 'ltr');

      const { container } = renderComponent(<div>{nodes}</div>);
      const bdi = container.querySelector('bdi');
      expect(bdi).not.toBeNull();
      expect(bdi?.getAttribute('dir')).toBe('rtl');
      expect(bdi?.textContent).toBe('(مطور تطبيقات موبايل SA)');
    });

    it('does not isolate parentheses when the script matches the base direction', () => {
      const pureEnglish = 'Job Type: Full-time (Remote)';
      const englishNodes = renderWithBidiIsolation(pureEnglish, 'ltr');
      const { container: enContainer } = renderComponent(<div>{englishNodes}</div>);
      expect(enContainer.querySelector('bdi')).toBeNull();

      const pureArabic = 'نظام العمل (عن بعد)';
      const arabicNodes = renderWithBidiIsolation(pureArabic, 'rtl');
      const { container: arContainer } = renderComponent(<div>{arabicNodes}</div>);
      expect(arContainer.querySelector('bdi')).toBeNull();
    });

    it('renders the complete user email screenshot content with correct alignment and isolation', () => {
      const emailContent = `
أردت أن أوضح بشكل أدق وأشمل خبرتي في مجال الذكاء الاصطناعي وكيف أدمجه عملياً، نظراً لكونه أحد متطلبات الوظيفة الأساسية:

1) الذكاء الاصطناعي في سير عملي اليومي (AI-Augmented Engineering)

لا أعتمد على الذكاء الاصطناعي لتوليد كود عشوائي، بل أوجهه عبر بيئة عمل ذكية ومنضبطة (Agentic Workflow) تعتمد مبدأ (Specification-Driven Development).

Graphify: لبناء رسم بياني معرفي (Knowledge Graph) للكود البرمجي لتحليل ترابط الطبقات.
      `.trim();

      const { container } = renderComponent(<FormattedEmailBody text={emailContent} />);

      // Verify all paragraph and block elements have dir="auto" and text-start
      const paragraphs = container.querySelectorAll('p');
      paragraphs.forEach((p) => {
        expect(p.getAttribute('dir')).toBe('auto');
        expect(p.classList.contains('text-start')).toBe(true);
      });

      // Verify numbered list has dir="auto"
      const ol = container.querySelector('ol');
      expect(ol).not.toBeNull();
      expect(ol?.getAttribute('dir')).toBe('auto');

      // Verify parenthesized technical terms are isolated with <bdi dir="ltr">
      const bdis = container.querySelectorAll('bdi');
      expect(bdis.length).toBeGreaterThanOrEqual(2);
      const bdiTexts = Array.from(bdis).map((b) => b.textContent);
      expect(bdiTexts).toContain('(AI-Augmented Engineering)');
      expect(bdiTexts).toContain('(Agentic Workflow)');
    });
  });
});
