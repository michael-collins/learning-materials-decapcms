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
    console.log('[Export] Starting Word concept export, content length:', content?.length)
    
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content provided for export')
    }
    
    // Helper to parse markdown text into TextRun objects
    const parseInlineMarkdown = (text: string): TextRun[] => {
      const runs: TextRun[] = []
      const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
      
      for (const part of parts) {
        if (!part) continue
        
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold text
          runs.push(new TextRun({
            text: part.slice(2, -2),
            bold: true
          }))
        } else if (part.startsWith('*') && part.endsWith('*')) {
          // Italic text
          runs.push(new TextRun({
            text: part.slice(1, -1),
            italics: true
          }))
        } else {
          // Regular text
          runs.push(new TextRun({ text: part }))
        }
      }
      
      return runs
    }
    
    const lines = content.split('\n')
    const paragraphs: Paragraph[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (!trimmed) {
        // Empty line
        paragraphs.push(new Paragraph({ text: '' }))
        continue
      }
      
      // Remove emoji unicode (docx handles text better than RTF)
      const cleanLine = trimmed
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/[🎯🎨🔍🛠️✅📋💡]/g, '')
      
      if (cleanLine.startsWith('# ')) {
        // H1
        const text = cleanLine.substring(2)
        paragraphs.push(new Paragraph({
          children: parseInlineMarkdown(text),
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 }
        }))
      } else if (cleanLine.startsWith('## ')) {
        // H2
        const text = cleanLine.substring(3)
        paragraphs.push(new Paragraph({
          children: parseInlineMarkdown(text),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 120 }
        }))
      } else if (cleanLine.startsWith('### ')) {
        // H3
        const text = cleanLine.substring(4)
        paragraphs.push(new Paragraph({
          children: parseInlineMarkdown(text),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 120, after: 80 }
        }))
      } else if (cleanLine.match(/^[0-9]+\.\s/)) {
        // Numbered list - keep as regular text with indent
        paragraphs.push(new Paragraph({
          children: parseInlineMarkdown(cleanLine),
          indent: { left: 360 },
          spacing: { after: 80 }
        }))
      } else if (cleanLine.match(/^[-*]\s/)) {
        // Bullet list
        const text = cleanLine.substring(2).trim()
        paragraphs.push(new Paragraph({
          children: parseInlineMarkdown(text),
          bullet: { level: 0 },
          spacing: { after: 80 }
        }))
      } else if (cleanLine === '---') {
        // Horizontal rule (represented as a line of dashes)
        paragraphs.push(new Paragraph({
          text: '_______________________________________________',
          spacing: { before: 200, after: 200 }
        }))
      } else {
        // Regular paragraph
        paragraphs.push(new Paragraph({
          children: parseInlineMarkdown(cleanLine),
          spacing: { after: 120 }
        }))
      }
    }
    
    // Don't add footer - it's already in the AI-generated content
    
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Helvetica'
            }
          }
        }
      },
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })
    
    const fileName = `project_concept_${new Date().toISOString().slice(0, 10)}.docx`
    await downloadDocx(doc, fileName)
    console.log('[Export] Word document export completed successfully')
  }
  
  return {
    exportToWord,
    exportConceptToWord
  }
}
