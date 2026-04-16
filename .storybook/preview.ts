import type { Preview } from '@storybook/nextjs-vite'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // Acessibilidade ativa — crítico para plataforma TEA
    a11y: {
      config: {
        rules: [
          // WCAG AA mínimo para contraste (4.5:1 texto normal, 3:1 grande)
          { id: 'color-contrast', enabled: true },
          // Touch targets mínimos
          { id: 'target-size', enabled: true },
          // Labels obrigatórios em inputs
          { id: 'label', enabled: true },
          // Botões devem ter nome acessível
          { id: 'button-name', enabled: true },
          // Links devem ter texto descritivo
          { id: 'link-name', enabled: true },
        ],
      },
    },

    // Viewports para testes responsivos
    // Terapeutas usam tablets, admin usa desktop
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile (375px)',
          styles: { width: '375px', height: '812px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet (768px)',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop (1280px)',
          styles: { width: '1280px', height: '900px' },
          type: 'desktop',
        },
        wide: {
          name: 'Wide (1536px)',
          styles: { width: '1536px', height: '960px' },
          type: 'desktop',
        },
      },
      defaultViewport: 'desktop',
    },

    // Backgrounds para testar em diferentes fundos
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'muted', value: '#f9fafb' },
        { name: 'dark', value: '#0f172a' },
      ],
    },

    // Documetação automática
    docs: {
      toc: true,
    },
  },

  // Tags globais para documentação automática
  tags: ['autodocs'],
}

export default preview
