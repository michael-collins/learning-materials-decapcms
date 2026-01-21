import { readFileSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(() => {
  try {
    const filePath = join(process.cwd(), 'content/data/resources.json')
    const data = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(data)
    // Return the resources array from the wrapped structure
    return parsed.resources || []
  } catch (error) {
    console.error('Error reading resources:', error)
    return []
  }
})
