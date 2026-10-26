import { describe, it, expect } from 'vitest';
import {
  hasRtlText,
  detectTextDirection,
  getTextDirection,
  RTL_CHAR_REGEX,
  LTR_CHAR_REGEX,
} from '../../src/lib/rtlUtils';

describe('rtlUtils - Bidirectional & RTL Text Detection', () => {
  describe('hasRtlText', () => {
    it('returns false for null, undefined, empty, and pure English text', () => {
      expect(hasRtlText(null)).toBe(false);
      expect(hasRtlText(undefined)).toBe(false);
      expect(hasRtlText('')).toBe(false);
      expect(hasRtlText('Senior Flutter Developer Remote')).toBe(false);
      expect(hasRtlText('12345 !@#$%^&*()')).toBe(false);
    });

    it('returns true when Arabic characters are present anywhere', () => {
      expect(hasRtlText('مطور فلاتر')).toBe(true);
      expect(hasRtlText('Flutter Developer (مطور فلاتر)')).toBe(true);
      expect(hasRtlText('Email: romariosameh880@gmail.com - مرحباً')).toBe(true);
    });

    it('returns true for Hebrew and Persian characters', () => {
      expect(hasRtlText('שלום עולם')).toBe(true); // Hebrew
      expect(hasRtlText('برنامه‌نویس')).toBe(true); // Persian
    });
  });

  describe('detectTextDirection', () => {
    it('defaults to ltr for empty or whitespace text', () => {
      expect(detectTextDirection('')).toBe('ltr');
      expect(detectTextDirection('   ')).toBe('ltr');
      expect(detectTextDirection(null)).toBe('ltr');
    });

    it('detects pure Arabic text as rtl', () => {
      const arabic = 'تطوير وتصميم تطبيقات الجوال باستخدام إطار العمل فلاتر ولغة دارت.';
      expect(detectTextDirection(arabic)).toBe('rtl');
    });

    it('detects Arabic with leading bullet points or symbols as rtl', () => {
      expect(detectTextDirection('• تطوير وتصميم تطبيقات الجوال')).toBe('rtl');
      expect(detectTextDirection('- الدمج البرمجي للخدمات')).toBe('rtl');
      expect(detectTextDirection('* التعاون مع فريق التطوير')).toBe('rtl');
    });

    it('detects Arabic with list numbering as rtl', () => {
      expect(detectTextDirection('1. الذكاء الاصطناعي في سير عملي اليومي')).toBe('rtl');
      expect(detectTextDirection('1) الذكاء الاصطناعي في سير عملي اليومي (AI-Augmented)')).toBe('rtl');
      expect(detectTextDirection('2) بيئة عمل ذكية ومنضبطة')).toBe('rtl');
    });

    it('detects Arabic with markdown headers or blockquotes as rtl', () => {
      expect(detectTextDirection('## نظرة عامة على الوظيفة')).toBe('rtl');
      expect(detectTextDirection('### متطلبات الوظيفة')).toBe('rtl');
      expect(detectTextDirection('> ملاحظة هامة: يجب تقديم سيرة ذاتية')).toBe('rtl');
    });

    it('detects Arabic with embedded English technical terms as rtl', () => {
      const mixed = 'للإنضمام إلى فريق عمل شركة سعودية لتطوير تطبيق Flutter Developer ذكي';
      expect(detectTextDirection(mixed)).toBe('rtl');
    });

    it('detects Arabic starting with English brand/label prefix as rtl (the LinkedIn/Google gotcha)', () => {
      // Common pattern: English tag/label at the start of an Arabic description
      expect(
        detectTextDirection(
          'Graphify: لبناء رسم بياني معرفي للكود البرمجي لتحليل ترابط الطبقات'
        )
      ).toBe('rtl');

      expect(
        detectTextDirection(
          'Impeccable: للتدقيق الهندسي والتصميمي لواجهات المستخدم وضبط التسلسل الهرمي'
        )
      ).toBe('rtl');

      expect(
        detectTextDirection(
          'Note: يرجى إرسال نماذج من التطبيقات التي قمت ببرمجتها سابقاً'
        )
      ).toBe('rtl');
    });

    it('detects predominantly English text with small Arabic gloss as ltr', () => {
      expect(
        detectTextDirection(
          'Hiring: Flutter Developer – Remote for Saudi Company (مطور تطبيق موبايل SA)'
        )
      ).toBe('ltr');

      expect(
        detectTextDirection(
          'Role: Senior Flutter Developer (مطور فلاتر)'
        )
      ).toBe('ltr');

      expect(
        detectTextDirection(
          'Target Market: Saudi Arabia (SA شركة سعودية)'
        )
      ).toBe('ltr');
    });

    it('getTextDirection alias works identically', () => {
      expect(getTextDirection('مرحبا')).toBe('rtl');
      expect(getTextDirection('Hello')).toBe('ltr');
    });
  });
});
