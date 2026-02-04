import { queryCollection } from '@nuxt/content/preview'

// Simple test to see the actual path structure
const result = await queryCollection('exercises')
  .where({ _path: { $regex: /animated-procedural-textures/ } })
  .find()

console.log('Found exercises:')
result.forEach(ex => {
  console.log('  Path:', ex._path)
  console.log('  Title:', ex.title)
  console.log('  Version:', ex.version)
  console.log('---')
})
