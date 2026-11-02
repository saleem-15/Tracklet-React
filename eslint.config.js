import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '.agents/**',
      '.specify/**',
      '.github/**',
      '.impeccable/**',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'extension/**',
      'telemetry-data/**',
      'public/**',
      'scripts/**',
      '*.config.*',
      'vite.config.ts',
      'vitest.config.ts',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-empty': 'off',
      'no-extra-boolean-cast': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-misleading-character-class': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: ['src/**/*.{tsx,jsx}'],
    rules: {
      'no-alert': 'error',
      'react/jsx-no-target-blank': [
        'error',
        {
          allowReferrer: false,
          enforceDynamicLinks: 'always',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='select']",
          message:
            "Native <select> is banned. Use <CustomSelectDropdown> from '@/components/CustomSelectDropdown'.",
        },
        {
          selector:
            "JSXOpeningElement[name.name='textarea']:not(:has(JSXAttribute[name.name='className'] Identifier[name='UI_TOKENS']))",
          message:
            "Native <textarea> is banned for notes. Use <RichTextEditor> from '@/components/editor/RichTextEditor' or explicitly tokenize with UI_TOKENS.inputBase.",
        },
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name=/^(alert|confirm|prompt)$/]",
          message:
            'Native window.alert/confirm/prompt are banned. Use custom in-app modal dialogs or onShowToast.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='a']:has(JSXAttribute[name.name='target'][value.value='_blank']):not(:has(JSXAttribute[name.name='rel'][value.value=/noopener/][value.value=/noreferrer/]))",
          message:
            'All outbound links with target="_blank" must include rel="noopener noreferrer".',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] :matches(Literal[value=/\\[#[0-9a-fA-F]{3,8}\\]/], TemplateElement[value.raw=/\\[#[0-9a-fA-F]{3,8}\\]/])",
          message:
            "Arbitrary hex color classes like 'bg-[#...]' or 'text-[#...]' are banned. Use Tailwind semantic colors or UI_TOKENS.",
        },
        {
          selector:
            "JSXAttribute[name.name='className'] :matches(Literal[value=/(^|[\\s:])(bg|text|border|ring)-red-[0-9]{2,3}/], TemplateElement[value.raw=/(^|[\\s:])(bg|text|border|ring)-red-[0-9]{2,3}/])",
          message:
            "Raw Tailwind red classes ('bg-red-*', 'text-red-*') are banned. Use Tracklet's standardized rose palette ('text-rose-600', 'bg-rose-50') or DeleteIconButton.",
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'idb',
              message:
                'Direct imports of idb are disallowed in view components. Use ApplicationRepository instead.',
            },
            {
              name: 'localforage',
              message:
                'Direct imports of localforage are disallowed in view components. Use ApplicationRepository instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/components/editor/**',
      'src/components/ImportCSVModal.tsx',
      'src/components/feedback/TesterReportModal.tsx',
      'src/components/settings/panes/autofill/AutofillSnippetsCard.tsx',
      'src/components/templates/FollowUpComposer.tsx',
      'src/components/templates/TemplateEditorModal.tsx',
      'src/components/detail/EmailLogForm.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='select']",
          message:
            "Native <select> is banned. Use <CustomSelectDropdown> from '@/components/CustomSelectDropdown'.",
        },
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name=/^(alert|confirm|prompt)$/]",
          message:
            'Native window.alert/confirm/prompt are banned. Use custom in-app modal dialogs or onShowToast.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='a']:has(JSXAttribute[name.name='target'][value.value='_blank']):not(:has(JSXAttribute[name.name='rel'][value.value=/noopener/][value.value=/noreferrer/]))",
          message:
            'All outbound links with target="_blank" must include rel="noopener noreferrer".',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] :matches(Literal[value=/\\[#[0-9a-fA-F]{3,8}\\]/], TemplateElement[value.raw=/\\[#[0-9a-fA-F]{3,8}\\]/])",
          message:
            "Arbitrary hex color classes like 'bg-[#...]' or 'text-[#...]' are banned. Use Tailwind semantic colors or UI_TOKENS.",
        },
        {
          selector:
            "JSXAttribute[name.name='className'] :matches(Literal[value=/(^|[\\s:])(bg|text|border|ring)-red-[0-9]{2,3}/], TemplateElement[value.raw=/(^|[\\s:])(bg|text|border|ring)-red-[0-9]{2,3}/])",
          message:
            "Raw Tailwind red classes ('bg-red-*', 'text-red-*') are banned. Use Tracklet's standardized rose palette ('text-rose-600', 'bg-rose-50') or DeleteIconButton.",
        },
      ],
    },
  }
);
