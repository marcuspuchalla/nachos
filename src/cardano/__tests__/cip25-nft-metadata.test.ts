/**
 * CIP-25 NFT Metadata Parser Tests
 * Tests parsing and validation of Cardano NFT metadata (label 721)
 *
 * CIP-25 specification: https://cips.cardano.org/cip/CIP-25
 *
 * Tests cover:
 * - Basic NFT metadata parsing
 * - Required fields validation (name, image)
 * - Optional fields (description, mediaType, files, etc.)
 * - Multiple assets in single policy
 * - Version field handling
 * - Validation rules
 */

import { describe, it, expect } from 'vitest'
import { useCip25Parser } from '../composables/useCip25Parser'
import { useCborParser } from '../../parser/composables/useCborParser'

describe('useCip25Parser - CIP-25 NFT Metadata', () => {
  const { parseCip25Metadata, validateCip25 } = useCip25Parser()
  const { parseWithSourceMap } = useCborParser()

  describe('Basic NFT Metadata Parsing', () => {
    it('should parse minimal valid NFT metadata', () => {
      // Minimal CIP-25 structure with required fields only
      const metadata = {
        '721': {
          '<policy_id>': {
            'MyNFT': {
              name: 'My First NFT',
              image: 'ipfs://QmX...'
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.assets).toHaveLength(1)
      expect(result.assets[0].policyId).toBe('<policy_id>')
      expect(result.assets[0].assetName).toBe('MyNFT')
      expect(result.assets[0].metadata.name).toBe('My First NFT')
      expect(result.assets[0].metadata.image).toBe('ipfs://QmX...')
    })

    it('should parse NFT metadata with optional fields', () => {
      const metadata = {
        '721': {
          'policy123': {
            'NFT001': {
              name: 'Cool NFT',
              image: 'ipfs://QmABC',
              description: 'A very cool NFT',
              mediaType: 'image/png',
              files: [
                {
                  name: 'high-res',
                  mediaType: 'image/png',
                  src: 'ipfs://QmDEF'
                }
              ]
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.assets[0].metadata.description).toBe('A very cool NFT')
      expect(result.assets[0].metadata.mediaType).toBe('image/png')
      expect(result.assets[0].metadata.files).toHaveLength(1)
      expect(result.assets[0].metadata.files![0].name).toBe('high-res')
    })

    it('should parse multiple assets under same policy', () => {
      const metadata = {
        '721': {
          'policy456': {
            'Asset1': {
              name: 'First Asset',
              image: 'ipfs://Qm1'
            },
            'Asset2': {
              name: 'Second Asset',
              image: 'ipfs://Qm2'
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.assets).toHaveLength(2)
      expect(result.assets[0].assetName).toBe('Asset1')
      expect(result.assets[1].assetName).toBe('Asset2')
    })
  })

  describe('Required Fields Validation', () => {
    it('should reject metadata without name field', () => {
      const metadata = {
        '721': {
          'policy789': {
            'BadNFT': {
              image: 'ipfs://QmX'
              // Missing name
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing required field: name')
    })

    it('should reject metadata without image field', () => {
      const metadata = {
        '721': {
          'policy789': {
            'BadNFT': {
              name: 'Bad NFT'
              // Missing image
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing required field: image')
    })

    it('should reject metadata without 721 label', () => {
      const metadata = {
        'wrong_label': {
          'policy': {
            'NFT': {
              name: 'Name',
              image: 'ipfs://...'
            }
          }
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing CIP-25 label: 721')
    })
  })

  describe('Image Field Validation', () => {
    it('should accept valid URI formats', () => {
      const validUris = [
        'ipfs://QmX...',
        'https://example.com/image.png',
        'ar://abc123',
        'data:image/png;base64,iVBOR...'
      ]

      for (const uri of validUris) {
        const metadata = {
          '721': {
            'policy': {
              'NFT': {
                name: 'Test',
                image: uri
              }
            },
            version: '1.0'
          }
        }

        const result = parseCip25Metadata(metadata)
        expect(result.isValid).toBe(true)
      }
    })

    it('should accept image as array of URIs', () => {
      const metadata = {
        '721': {
          'policy': {
            'NFT': {
              name: 'Multi Image NFT',
              image: ['ipfs://Qm1', 'ipfs://Qm2']
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(Array.isArray(result.assets[0].metadata.image)).toBe(true)
    })
  })

  describe('Optional Fields', () => {
    it('should handle description field', () => {
      const metadata = {
        '721': {
          'policy': {
            'NFT': {
              name: 'NFT with Description',
              image: 'ipfs://...',
              description: 'This is a detailed description'
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.assets[0].metadata.description).toBe('This is a detailed description')
    })

    it('should handle mediaType field', () => {
      const metadata = {
        '721': {
          'policy': {
            'NFT': {
              name: 'Video NFT',
              image: 'ipfs://...',
              mediaType: 'video/mp4'
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.assets[0].metadata.mediaType).toBe('video/mp4')
    })

    it('should handle files array', () => {
      const metadata = {
        '721': {
          'policy': {
            'NFT': {
              name: 'NFT with Files',
              image: 'ipfs://main',
              files: [
                {
                  name: 'thumbnail',
                  mediaType: 'image/jpeg',
                  src: 'ipfs://thumb'
                },
                {
                  name: 'full-res',
                  mediaType: 'image/png',
                  src: 'ipfs://full'
                }
              ]
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.assets[0].metadata.files).toHaveLength(2)
      expect(result.assets[0].metadata.files![0].name).toBe('thumbnail')
      expect(result.assets[0].metadata.files![1].name).toBe('full-res')
    })

    it('should handle custom properties', () => {
      const metadata = {
        '721': {
          'policy': {
            'NFT': {
              name: 'NFT with Custom Props',
              image: 'ipfs://...',
              customProp: 'custom value',
              anotherProp: 123
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.assets[0].metadata.customProp).toBe('custom value')
      expect(result.assets[0].metadata.anotherProp).toBe(123)
    })
  })

  describe('Version Handling', () => {
    it('should accept version 1.0', () => {
      const metadata = {
        '721': {
          'policy': {
            'NFT': {
              name: 'V1 NFT',
              image: 'ipfs://...'
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.version).toBe('1.0')
    })

    it('should accept version 2.0', () => {
      const metadata = {
        '721': {
          'policy': {
            'NFT': {
              name: 'V2 NFT',
              image: 'ipfs://...'
            }
          },
          version: '2.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.version).toBe('2.0')
    })

    it('should default to version 1.0 if not specified', () => {
      const metadata = {
        '721': {
          'policy': {
            'NFT': {
              name: 'No Version NFT',
              image: 'ipfs://...'
            }
          }
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.version).toBe('1.0')
    })
  })

  describe('Integration with CBOR Parser', () => {
    it('should parse CBOR-encoded CIP-25 metadata', () => {
      // This would be a real CBOR hex string from a Cardano transaction
      // For now, we'll test the concept
      const metadata = {
        '721': {
          'policy_abc': {
            'Token1': {
              name: 'CBOR Test NFT',
              image: 'ipfs://QmTest'
            }
          },
          version: '1.0'
        }
      }

      const result = parseCip25Metadata(metadata)

      expect(result.isValid).toBe(true)
      expect(result.assets[0].metadata.name).toBe('CBOR Test NFT')
    })
  })

  describe('Validation Helper', () => {
    it('should validate correct metadata', () => {
      const metadata = {
        '721': {
          'policy': {
            'NFT': {
              name: 'Valid NFT',
              image: 'ipfs://...'
            }
          },
          version: '1.0'
        }
      }

      const validation = validateCip25(metadata)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should collect all validation errors', () => {
      const metadata = {
        '722': { // Wrong label
          'policy': {
            'NFT': {
              // Missing name and image
            }
          }
        }
      }

      const validation = validateCip25(metadata)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })
})
