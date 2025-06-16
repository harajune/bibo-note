import { describe, it, expect } from 'vitest'
import { generateUUID } from '../utils/uuid'

describe('UUID Utils', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID v7', () => {
      const uuid = generateUUID()
      
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()
      
      expect(uuid1).not.toBe(uuid2)
    })

    it('should generate UUIDs with version 7', () => {
      const uuid = generateUUID()
      const version = uuid.charAt(14)
      
      expect(version).toBe('7')
    })
  })
})
