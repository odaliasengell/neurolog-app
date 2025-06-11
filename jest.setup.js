import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/dashboard'
  },
  notFound() {
    throw new Error('Page not found')
  },
}))

// Mock next/image
jest.mock('next/image', () => {
  return function MockedImage(props) {
    return React.createElement('img', props)
  }
})

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          limit: jest.fn(),
        })),
        limit: jest.fn(),
        order: jest.fn(),
      })),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  },
}))

// Helper functions para testing
global.createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@ejemplo.com',
  full_name: 'Usuario Test',
  role: 'parent',
  avatar_url: null,
  phone: null,
  is_active: true,
  last_login: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
})

global.createMockChild = (overrides = {}) => ({
  id: 'child-123',
  name: 'Niño Test',
  birth_date: '2015-01-01',
  diagnosis: 'TEA',
  notes: 'Notas de prueba',
  is_active: true,
  created_by: 'user-123',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
})

global.createMockDailyLog = (overrides = {}) => ({
  id: 'log-123',
  child_id: 'child-123',
  category_id: 'cat-123',
  title: 'Registro de prueba',
  content: 'Contenido del registro de prueba',
  mood_score: 3,
  intensity_level: 'medium',
  logged_by: 'user-123',
  log_date: '2025-01-01',
  is_private: false,
  attachments: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
})

// Configuración global para tests
beforeEach(() => {
  jest.clearAllMocks()
})

// Configurar timeouts para tests async
jest.setTimeout(10000)