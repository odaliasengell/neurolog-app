// src/lib/__tests__/utils.test.ts
import {
  formatDate,
  calculateAge,
  validateEmail,
  validatePassword,
  debounce,
  truncateText,
  getInitials,
  sanitizeInput,
  isValidUUID,
  handleSupabaseError,
} from '../utils'

describe('Utils', () => {
  describe('formatDate', () => {
    it('should format valid date string', () => {
      expect(formatDate('2023-12-25')).toBe('25/12/2023')
    })

    it('should format valid Date object', () => {
      const date = new Date('2023-12-25')
      expect(formatDate(date)).toBe('25/12/2023')
    })

    it('should handle invalid date', () => {
      expect(formatDate('invalid-date')).toBe('Fecha inválida')
    })
  })

  describe('calculateAge', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-15'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should calculate correct age', () => {
      expect(calculateAge('2015-01-01')).toBe(10)
      expect(calculateAge('2020-06-15')).toBe(4)
    })

    it('should handle birthday not yet reached this year', () => {
      expect(calculateAge('2015-06-01')).toBe(9) // Birthday hasn't occurred yet
    })

    it('should handle invalid date', () => {
      expect(calculateAge('invalid')).toBe(0)
    })
  })

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = validatePassword('Password123')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject weak passwords', () => {
      const result = validatePassword('weak')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('La contraseña debe tener al menos 8 caracteres')
      expect(result.errors).toContain('La contraseña debe tener al menos una letra mayúscula')
      expect(result.errors).toContain('La contraseña debe tener al menos un número')
    })
  })

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      jest.useFakeTimers()
      
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('test1')
      debouncedFn('test2')
      debouncedFn('test3')

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('test3')

      jest.useRealTimers()
    })
  })

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that needs to be truncated'
      expect(truncateText(longText, 20)).toBe('This is a very long ...')
    })

    it('should not truncate short text', () => {
      const shortText = 'Short text'
      expect(truncateText(shortText, 20)).toBe('Short text')
    })
  })

  describe('getInitials', () => {
    it('should get initials from name', () => {
      expect(getInitials('John Doe')).toBe('JD')
      expect(getInitials('María García López')).toBe('MG')
      expect(getInitials('Ana')).toBe('A')
    })
  })

  describe('sanitizeInput', () => {
    it('should remove HTML tags and trim', () => {
      expect(sanitizeInput('  <script>alert("xss")</script>test  ')).toBe('alert("xss")test')
      expect(sanitizeInput('<div>Hello</div>')).toBe('Hello')
    })
  })

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    })

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false)
      expect(isValidUUID('123')).toBe(false)
    })
  })

  describe('handleSupabaseError', () => {
    it('should handle not found error', () => {
      const error = { code: 'PGRST116', message: 'Not found' }
      const appError = handleSupabaseError(error)
      expect(appError.code).toBe('NOT_FOUND')
      expect(appError.statusCode).toBe(404)
    })

    it('should handle duplicate error', () => {
      const error = { code: '23505', message: 'Duplicate' }
      const appError = handleSupabaseError(error)
      expect(appError.code).toBe('DUPLICATE')
      expect(appError.statusCode).toBe(409)
    })

    it('should handle generic error', () => {
      const error = { message: 'Generic error' }
      const appError = handleSupabaseError(error)
      expect(appError.code).toBe('INTERNAL_ERROR')
      expect(appError.statusCode).toBe(500)
    })
  })
})