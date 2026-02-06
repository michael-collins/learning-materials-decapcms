import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, Packer } from 'docx'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Helper: reliable browser download for .docx files
async function downloadDocx(doc: InstanceType<typeof Document>, fileName: string) {
  try {
    // Primary: use toBlob
    const blob = await Packer.toBlob(doc)
    const docxBlob = new Blob([blob], { type: DOCX_MIME })
    triggerDownload(docxBlob, fileName)
    return
  } catch (e) {
    console.warn('[Export] toBlob failed, trying base64 fallback:', e)
  }

  try {
    // Fallback: use toBase64String and convert to blob
    const base64 = await Packer.toBase64String(doc)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: DOCX_MIME })
    triggerDownload(blob, fileName)
  } catch (e2) {
    console.error('[Export] Both toBlob and base64 fallback failed:', e2)
    throw new Error('Failed to generate Word document. Check browser console for details.')
  }
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  // Small delay before cleanup to ensure download starts
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 500)
}

interface LearningStep {
  step: number
  title: string
  description?: string
  duration?: string
  materials: Array<{
    title: string
    type: string
    path: string
    reason?: string
  }>
}

export function useLearningPlanExport() {
  const exportToWord = async (planTitle: string, planDescription: string, steps: LearningStep[]) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: planTitle,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
          }),
          
          // Description
          new Paragraph({
            text: planDescription,
            spacing: { after: 400 }
          }),
          
          // Steps
          ...steps.flatMap((step, idx) => {
            const stepParagraphs: Paragraph[] = [
              new Paragraph({
                text: `Step ${step.step}: ${step.title}`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: idx > 0 ? 300 : 0, after: 100 }
              })
            ]
            
            if (step.duration) {
              stepParagraphs.push(new Paragraph({
                children: [
                  new TextRun({
                    text: `Duration: ${step.duration}`,
                    italics: true,
                    color: '666666'
                  })
                ],
                spacing: { after: 100 }
              }))
            }
            
            if (step.description) {
              stepParagraphs.push(new Paragraph({
                text: step.description,
                spacing: { after: 200 }
              }))
            }
            
            // Materials
            if (step.materials.length > 0) {
              stepParagraphs.push(new Paragraph({
                text: 'Materials:',
                heading: HeadingLevel.HEADING_3,
                spacing: { after: 100 }
              }))
              
              step.materials.forEach(material => {
                stepParagraphs.push(new Paragraph({
                  text: `• ${material.title} (${material.type})`,
                  spacing: { after: 50 },
                  bullet: { level: 0 }
                }))
                
                if (material.reason) {
                  stepParagraphs.push(new Paragraph({
                    text: `  ${material.reason}`,
                    spacing: { after: 100 },
                    indent: { left: 720 }
                  }))
                }
              })
            }
            
            return stepParagraphs
          }),
          
          // Footer
          new Paragraph({
            text: '---',
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on ${new Date().toLocaleDateString()}`,
                italics: true,
                color: '999999',
                size: 18
              })
            ]
          })
        ]
      }]
    })
    
    const fileName = `${planTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_learning_plan.docx`
    await downloadDocx(doc, fileName)
  }

  const exportConceptToWord = async (content: string) => {
    console.log('[Export] Starting RTF concept export, content length:', content?.length)
    
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content provided for export')
    }
    
    // Helper to clean and escape text for RTF
    const cleanText = (text: string): string => {
      return text
        // Remove emojis and special unicode characters
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/[🎯🎨🔍🛠️✅📋💡]/g, '')
        // Convert smart quotes and other special chars (dashes handled earlier in main loop)
        .replace(/'/g, "'")  // smart single quote
        .replace(/'/g, "'")  // smart single quote
        .replace(/"/g, '"')  // smart double quote
        .replace(/"/g, '"')  // smart double quote
        .replace(/…/g, '...')  // ellipsis
        // Escape RTF special characters
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .trim()
    }
    
    // Helper to process inline markdown (bold, italic)
    const processInline = (text: string): string => {
      let result = cleanText(text)
      // Replace **bold** with RTF bold codes
      result = result.replace(/\*\*([^*]+)\*\*/g, '{\\b $1}')
      // Replace *italic* with RTF italic codes (single asterisk)
      result = result.replace(/\*([^*]+)\*/g, '{\\i $1}')
      return result
    }
    
    // Generate RTF content
    let rtf = '{\\rtf1\\ansi\\deff0\n'
    rtf += '{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}}\n'
    rtf += '\\viewkind4\\uc1\\pard\\f0\\fs24\n'
    
    const lines = content.split('\n')
    
    for (const line of lines) {
      let trimmed = line.trim()
      if (!trimmed) {
        rtf += '\\par\n'
        continue
      }
      
      // Convert em/en dashes to regular hyphens FIRST, before any other processing
      trimmed = trimmed.replace(/—/g, '-').replace(/–/g, '-')
      
      if (trimmed.startsWith('# ')) {
        // H1 - Large, bold
        const text = processInline(trimmed.substring(2))
        rtf += `\\pard\\sb240\\sa120\\b\\fs32 ${text}\\b0\\fs24\\par\n`
      } else if (trimmed.startsWith('## ')) {
        // H2 - Medium, bold
        const text = processInline(trimmed.substring(3))
        rtf += `\\pard\\sb180\\sa100\\b\\fs28 ${text}\\b0\\fs24\\par\n`
      } else if (trimmed.startsWith('### ')) {
        // H3 - Smaller, bold
        const text = processInline(trimmed.substring(4))
        rtf += `\\pard\\sb120\\sa80\\b\\fs26 ${text}\\b0\\fs24\\par\n`
      } else if (trimmed.match(/^[0-9]+\.\s/)) {
        // Numbered list - keep the number
        const text = processInline(trimmed)
        rtf += `\\pard\\li360\\sa60 ${text}\\par\n`
      } else if (trimmed.match(/^[-*]\s/)) {
        // Bullet list - remove the markdown bullet/hyphen
        let text = trimmed.substring(2).trim()
        // Remove ALL leading hyphens, dashes, and spaces aggressively
        while (text.match(/^[-—–\s]/)) {
          text = text.substring(1).trim()
        }
        const processed = processInline(text)
        rtf += `\\pard\\li360\\sa60 \\bullet  ${processed}\\par\n`
      } else if (trimmed === '---') {
        // Horizontal rule
        rtf += `\\pard\\sb120\\sa120\\brdrb\\brdrs\\brdrw10\\brsp20\\par\n`
      } else {
        // Regular paragraph
        const text = processInline(trimmed)
        rtf += `\\pard\\sa100 ${text}\\par\n`
      }
    }
    
    // Add footer
    rtf += '\\pard\\sb240\\sa60\\i\\fs20 Generated on ' + new Date().toLocaleDateString() + '\\i0\\fs24\\par\n'
    rtf += '}\n'
    
    console.log('[Export] Generated RTF, length:', rtf.length)
    
    // Create blob and download
    const blob = new Blob([rtf], { type: 'application/rtf' })
    const fileName = `project_concept_${new Date().toISOString().slice(0, 10)}.rtf`
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 500)
    
    console.log('[Export] RTF download completed successfully')
  }
  
  return {
    exportToWord,
    exportConceptToWord
  }
}
