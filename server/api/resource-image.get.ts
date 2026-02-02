export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const url = query.url as string

  if (!url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'URL parameter is required'
    })
  }

  try {
    // Validate URL format
    new URL(url)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid URL format'
    })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(8000) // 8 second timeout
    })

    if (!response.ok) {
      // Return favicon as fallback
      return {
        image: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=128`,
        source: 'favicon'
      }
    }

    const html = await response.text()

    // Collect all potential images with metadata
    const images: Array<{ url: string; source: string; priority: number }> = []

    // 1. Extract Open Graph image (highest priority)
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    if (ogImageMatch && ogImageMatch[1]) {
      images.push({
        url: ogImageMatch[1],
        source: 'og:image',
        priority: 100
      })
    }

    // 2. Extract Open Graph image:secure_url
    const ogSecureImageMatch = html.match(/<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i)
    if (ogSecureImageMatch && ogSecureImageMatch[1]) {
      images.push({
        url: ogSecureImageMatch[1],
        source: 'og:image:secure_url',
        priority: 98
      })
    }

    // 3. Extract Twitter image
    const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)
    if (twitterImageMatch && twitterImageMatch[1]) {
      images.push({
        url: twitterImageMatch[1],
        source: 'twitter:image',
        priority: 95
      })
    }

    // 4. Extract from data-social-share-image (common pattern)
    const dataSocialMatch = html.match(/data-social-share-image=["']([^"']+)["']/i)
    if (dataSocialMatch && dataSocialMatch[1]) {
      images.push({
        url: dataSocialMatch[1],
        source: 'data-social-share-image',
        priority: 92
      })
    }

    // 5. Extract from style background-image in hero/banner sections
    const styleHeroMatches = html.matchAll(/(?:class|id)\s*=\s*["']([^"']*(?:hero|banner|header|cover|feature)[^"']*)["'][^>]*style=["']([^"']*)["']/gi)
    for (const match of styleHeroMatches) {
      const styleStr = match[2]
      const bgImageMatch = styleStr.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i)
      if (bgImageMatch && bgImageMatch[1]) {
        images.push({
          url: bgImageMatch[1],
          source: 'style-hero-background',
          priority: 88
        })
      }
    }

    // 6. Extract from data attributes (common in modern frameworks)
    const dataImageMatches = html.matchAll(/data-(?:image|src|background)=["']([^"']+)["']/gi)
    for (const match of dataImageMatches) {
      if (match[1] && !match[1].includes('logo') && !match[1].includes('icon')) {
        images.push({
          url: match[1],
          source: 'data-attribute',
          priority: 75
        })
      }
    }

    // 7. Extract all img src attributes and filter for reasonably sized ones
    const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*(?:width=["'](\d+)["'])?[^>]*(?:height=["'](\d+)["'])?/gi)
    for (const match of imgMatches) {
      const [, imgUrl, width, height] = match
      if (imgUrl && !imgUrl.includes('logo') && !imgUrl.includes('icon') && !imgUrl.includes('favicon') && !imgUrl.includes('pixel')) {
        // Estimate size priority based on dimensions or URL patterns
        let sizePriority = 60
        if (width && height) {
          const area = parseInt(width) * parseInt(height)
          if (area > 200000) sizePriority = 85 // Large image
          else if (area > 100000) sizePriority = 80
          else if (area > 50000) sizePriority = 70
          else if (area < 5000) sizePriority = 20 // Skip very small images
        } else {
          // No dimensions, but likely a content image
          sizePriority = 65
        }

        // Boost score for URLs that suggest they're main images
        if (imgUrl.includes('hero') || imgUrl.includes('banner') || imgUrl.includes('cover') || imgUrl.includes('feature')) {
          sizePriority = Math.max(sizePriority, 82)
        }

        images.push({
          url: imgUrl,
          source: 'img-tag',
          priority: sizePriority
        })
      }
    }

    // 8. Extract picture element sources
    const pictureMatches = html.matchAll(/<picture[^>]*>[\s\S]*?<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi)
    for (const match of pictureMatches) {
      if (match[1]) {
        // Get first image from srcset
        const srcsetImages = match[1].split(',')[0].trim().split(/\s+/)[0]
        if (srcsetImages) {
          images.push({
            url: srcsetImages,
            source: 'picture-element',
            priority: 80
          })
        }
      }
    }

    // 10. Extract from any background-image in any style attribute
    const allBackgroundImages = html.matchAll(/style=["']([^"']*background-image[^"']*)["']/gi)
    for (const match of allBackgroundImages) {
      const styleStr = match[1]
      const bgImageMatch = styleStr.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i)
      if (bgImageMatch && bgImageMatch[1]) {
        images.push({
          url: bgImageMatch[1],
          source: 'style-background-any',
          priority: 76
        })
      }
    }

    // 11. Extract from srcset attributes (responsive images)
    const srcsetMatches = html.matchAll(/srcset=["']([^"']+)["']/gi)
    for (const match of srcsetMatches) {
      if (match[1]) {
        // Get first image from srcset (usually lowest quality)
        const firstImage = match[1].split(',')[0].trim().split(/\s+/)[0]
        if (firstImage && !firstImage.includes('logo') && !firstImage.includes('icon')) {
          images.push({
            url: firstImage,
            source: 'srcset',
            priority: 72
          })
        }
      }
    }

    // 12. Extract from poster attribute (video posters)
    const posterMatches = html.matchAll(/poster=["']([^"']+)["']/gi)
    for (const match of posterMatches) {
      if (match[1]) {
        images.push({
          url: match[1],
          source: 'video-poster',
          priority: 78
        })
      }
    }

    // 13. Extract from iframely or similar embed data
    const embedImageMatches = html.matchAll(/["']image["']\s*:\s*["']([^"']+)["']/gi)
    for (const match of embedImageMatches) {
      if (match[1] && !match[1].includes('logo') && !match[1].includes('icon')) {
        images.push({
          url: match[1],
          source: 'embed-data',
          priority: 74
        })
      }
    }

    // 14. Extract largest image from page using heuristics
    const largeImgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)
    let largestImageArea = 0
    let largestImage: string | null = null
    for (const match of largeImgMatches) {
      const imgUrl = match[1]
      if (imgUrl && !imgUrl.includes('logo') && !imgUrl.includes('icon') && !imgUrl.includes('favicon') && !imgUrl.includes('pixel') && !imgUrl.includes('.svg')) {
        // Try to estimate from URL patterns
        let estimatedArea = 50000 // default medium size
        if (imgUrl.match(/\d{3,4}x\d{3,4}/)) {
          const dims = imgUrl.match(/(\d{3,4})x(\d{3,4})/)
          if (dims) {
            estimatedArea = parseInt(dims[1]) * parseInt(dims[2])
          }
        }
        if (estimatedArea > largestImageArea) {
          largestImageArea = estimatedArea
          largestImage = imgUrl
        }
      }
    }
    if (largestImage) {
      images.push({
        url: largestImage,
        source: 'largest-heuristic',
        priority: 68
      })
    }

    // 15. Extract favicon (lowest priority)
    const faviconMatch = html.match(/<link\s+rel=["'](?:icon|shortcut icon)["']\s+href=["']([^"']+)["']/i)
    if (faviconMatch && faviconMatch[1]) {
      images.push({
        url: faviconMatch[1],
        source: 'favicon',
        priority: 10
      })
    }
    const resolvedImages = new Map<string, { url: string; source: string; priority: number }>()
    for (const img of images) {
      try {
        let absoluteUrl = img.url
        if (absoluteUrl.startsWith('/')) {
          absoluteUrl = new URL(absoluteUrl, url).href
        } else if (!absoluteUrl.startsWith('http')) {
          absoluteUrl = new URL(absoluteUrl, url).href
        }

        // Filter out SVG files and tracking pixels if no better option exists
        if (absoluteUrl.includes('.svg') && images.some(i => !i.url.includes('.svg'))) {
          continue
        }

        // Use URL as key to deduplicate, keeping highest priority
        if (!resolvedImages.has(absoluteUrl) || resolvedImages.get(absoluteUrl)!.priority < img.priority) {
          resolvedImages.set(absoluteUrl, {
            url: absoluteUrl,
            source: img.source,
            priority: img.priority
          })
        }
      } catch (e) {
        // Skip malformed URLs
      }
    }

    // Sort by priority and use the best candidate
    if (resolvedImages.size > 0) {
      const sortedImages = Array.from(resolvedImages.values()).sort((a, b) => b.priority - a.priority)
      // Find first non-SVG image if possible
      const nonSvgImage = sortedImages.find(img => !img.url.includes('.svg'))
      const selectedImage = nonSvgImage || sortedImages[0]
      
      // Get a secondary image as fallback
      const fallbackImage = sortedImages.find(
        img => img.url !== selectedImage.url && !img.url.includes('.svg')
      ) || null
      
      return {
        primary: selectedImage.url,
        fallback: fallbackImage?.url || null,
        source: selectedImage.source
      }
    }

    // If no images found in HTML, try screenshot service as fallback
    const urlObj = new URL(url)
    
    // Return screenshot service with favicon as fallback
    return {
      primary: `https://image.thum.io/get/width/800/crop/600/${encodeURIComponent(url)}`,
      fallback: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlObj.hostname)}&sz=256`,
      source: 'screenshot-service'
    }
  } catch (error) {
    console.error('Error fetching resource image:', error)
    // Return favicon as final fallback
    try {
      const urlObj = new URL(url)
      return {
        image: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlObj.hostname)}&sz=128`,
        source: 'favicon-error-fallback'
      }
    } catch {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch image for resource'
      })
    }
  }
})
