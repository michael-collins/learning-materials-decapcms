import { defineEventHandler, getQuery } from 'h3'
import JSZip from 'jszip'

export default defineEventHandler(async (event) => {
  try {
    const { slug } = getQuery(event)
    
    if (!slug || typeof slug !== 'string') {
      throw new Error('Specialization slug is required')
    }

    // For now, create a basic export with placeholder data
    // In a production implementation, you'd fetch from your content source
    const specialization = {
      slug,
      title: 'Specialization: ' + slug,
      description: 'Course specialization export'
    }

    const lessons = [
      {
        slug: 'lesson-1',
        title: 'Lesson 1',
        description: 'First lesson',
        items: [
          { slug: 'item-1', title: 'Item 1', type: 'exercise', description: 'First item' },
          { slug: 'item-2', title: 'Item 2', type: 'tutorial', description: 'Second item' }
        ]
      }
    ]

    // Create zip file
    const zip = new JSZip()

    // Common Cartridge versions to create
    const ccVersions = ['1.1', '1.2', '1.3']

    for (const version of ccVersions) {
      const versionFolder = zip.folder(`cc-${version}`)
      if (!versionFolder) continue

      // Create imsmanifest.xml
      const manifest = generateManifest(specialization, lessons, version)
      versionFolder.file('imsmanifest.xml', manifest)

      // Create course structure folder
      const courseFolder = versionFolder.folder('course')
      if (!courseFolder) continue

      // Add lesson and item files
      for (const lesson of lessons) {
        const lessonFolder = courseFolder.folder(`lesson-${lesson.slug}`)
        if (!lessonFolder) continue

        // Add lesson overview
        const lessonContent = generateLessonContent(lesson)
        lessonFolder.file('overview.html', lessonContent)

        // Add items
        if (lesson.items && lesson.items.length > 0) {
          for (const item of lesson.items) {
            const itemContent = generateItemContent(item, lesson)
            lessonFolder.file(`${item.slug}.html`, itemContent)
          }
        }
      }
    }

    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

    // Set response headers
    setHeader(event, 'Content-Type', 'application/zip')
    setHeader(event, 'Content-Disposition', `attachment; filename="${slug}-cartridge.zip"`)
    setHeader(event, 'Cache-Control', 'no-cache')

    return Buffer.from(zipBuffer)
  } catch (error) {
    console.error('Export error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate Common Cartridge export',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

function generateManifest(specialization: any, lessons: any[], version: string): string {
  const timestamp = new Date().toISOString()
  
  const lessonItems = lessons
    .map(lesson => `
    <item identifier="lesson-${lesson.slug}" identifierref="resource-${lesson.slug}">
      <title>${escapeXml(lesson.title)}</title>
      ${lesson.items?.map((item: any) => `
      <item identifier="item-${item.slug}" identifierref="resource-${item.slug}">
        <title>${escapeXml(item.title)}</title>
      </item>`).join('') || ''}
    </item>`)
    .join('')

  const resources = lessons
    .map(lesson => `
    <resource identifier="resource-${lesson.slug}" type="webcontent" href="course/lesson-${lesson.slug}/overview.html">
      <file href="course/lesson-${lesson.slug}/overview.html" />
    </resource>
    ${lesson.items?.map((item: any) => `
    <resource identifier="resource-${item.slug}" type="webcontent" href="course/lesson-${lesson.slug}/${item.slug}.html">
      <file href="course/lesson-${lesson.slug}/${item.slug}.html" />
    </resource>`).join('') || ''}`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="manifest-${specialization.slug}" version="1.1"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adl_cp_v1_2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1p2.xsd
    http://www.adlnet.org/xsd/adl_cp_v1_2 http://www.adlnet.org/xsd/adl_cp_v1_2.xsd">
  
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>${version}</schemaversion>
  </metadata>
  
  <organizations default="org-${specialization.slug}">
    <organization identifier="org-${specialization.slug}">
      <title>${escapeXml(specialization.title)}</title>
      <item identifier="item-${specialization.slug}" identifierref="resource-${specialization.slug}">
        <title>${escapeXml(specialization.title)}</title>
        ${lessonItems}
      </item>
    </organization>
  </organizations>
  
  <resources>
    ${resources}
  </resources>
</manifest>`
}

function generateLessonContent(lesson: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(lesson.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .metadata { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .content { line-height: 1.6; }
  </style>
</head>
<body>
  <h1>${escapeHtml(lesson.title)}</h1>
  <div class="metadata">
    ${lesson.estimatedDuration ? `<p>Duration: ${escapeHtml(lesson.estimatedDuration)}</p>` : ''}
    ${lesson.difficulty ? `<p>Difficulty: ${escapeHtml(lesson.difficulty)}</p>` : ''}
  </div>
  <div class="content">
    ${lesson.description ? `<p>${escapeHtml(lesson.description)}</p>` : ''}
    ${lesson.learningObjectives?.length ? `
      <h2>Learning Objectives</h2>
      <ul>
        ${lesson.learningObjectives.map((obj: string) => `<li>${escapeHtml(obj)}</li>`).join('')}
      </ul>
    ` : ''}
  </div>
</body>
</html>`
}

function generateItemContent(item: any, lesson: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(item.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .metadata { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .content { line-height: 1.6; }
  </style>
</head>
<body>
  <h1>${escapeHtml(item.title)}</h1>
  <div class="metadata">
    <p>Lesson: ${escapeHtml(lesson.title)}</p>
    <p>Type: ${escapeHtml(item.type)}</p>
    ${item.estimatedDuration ? `<p>Duration: ${escapeHtml(item.estimatedDuration)}</p>` : ''}
  </div>
  <div class="content">
    ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
  </div>
</body>
</html>`
}

function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
