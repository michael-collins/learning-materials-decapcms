import { queryCollection } from '#content/server'

async function test() {
  const pathway = await queryCollection('pathways').path('/pathways/short-film-and-vfx').first()
  console.log('Pathway data:')
  console.log(JSON.stringify(pathway, null, 2))
}

test().catch(console.error)
