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
    
    // Parse the markdown-formatted concept summary
    const lines = content.split('\n')
    const paragraphs: any[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim()
      if (!line) continue // Skip empty lines
      
      try {
        if (line.startsWith('# ')) {
          // Main heading
          const text = line.replace(/^#\s+/, '').replace(/🎯\s*/, '')
          paragraphs.push(new Paragraph({
            text,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
          }))
        } else if (line.startsWith('## ')) {
          // Section heading
          const text = line.replace(/^##\s+/, '').replace(/[🎨🔍🛠️✅📋]\s*/, '')
          paragraphs.push(new Paragraph({
            text,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }))
        } else if (line.match(/^\*\*[^*]+\*\*:\s*/)) {
          // Label with content (e.g., "**Project Title:** Something")
          const match = line.match(/^\*\*([^*]+)\*\*:\s*(.*)/)
          if (match) {
            paragraphs.push(new Paragraph({
              children: [
                new TextRun({
                  text: match[1] + ': ',
                  bold: true
                }),
                new TextRun({
                  text: match[2]
                })
              ],
              spacing: { after: 100 }
            }))
          }
        } else if (line.match(/^\*\*[^*]+\*\*$/)) {
          // Bold line only
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: line.replace(/\*\*/g, ''),
                bold: true
              })
            ],
            spacing: { after: 100 }
          }))
        } else if (line.match(/^[0-9]+\.\s/)) {
          // Numbered list
          const text = line.replace(/^[0-9]+\.\s+/, '')
          paragraphs.push(new Paragraph({
            text,
            numbering: { reference: 'default-numbering', level: 0 },
            spacing: { after: 50 }
          }))
        } else if (line.match(/^[-*]\s/)) {
          // Bullet list
          const text = line.replace(/^[-*]\s+/, '')
          paragraphs.push(new Paragraph({
            text,
            bullet: { level: 0 },
            spacing: { after: 50 }
          }))
        } else if (line === '---') {
          // Horizontal rule
          paragraphs.push(new Paragraph({
            text: '',
            border: {
              bottom: {
                color: 'auto',
                space: 1,
                style: 'single',
                size: 6
              }
            },
            spacing: { before: 200, after: 200 }
          }))
        } else if (line.match(/^\*[^*]+\*$/)) {
          // Italic note (single asterisks)
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: line.replace(/\*/g, ''),
                italics: true,
                color: '666666'
              })
            ],
            spacing: { before: 200, after: 100 }
          }))
        } else {
          // Regular paragraph - handle inline bold
          const parts: any[] = []
          const boldPattern = /\*\*([^*]+)\*\*/g
          let lastIndex = 0
          let match
          
          while ((match = boldPattern.exec(line)) !== null) {
            // Add text before bold
            if (match.index > lastIndex) {
              parts.push(new TextRun({
                text: line.substring(lastIndex, match.index)
              }))
            }
            // Add bold text
            parts.push(new TextRun({
              text: match[1],
              bold: true
            }))
            lastIndex = match.index + match[0].length
          }
          
          // Add remaining text
          if (lastIndex < line.length) {
            parts.push(new TextRun({
              text: line.substring(lastIndex)
            }))
          }
          
          paragraphs.push(new Paragraph({
            children: parts.length > 0 ? parts : [new TextRun({ text: line })],
            spacing: { after: 100 }
          }))
        }
      } catch (err) {
        console.error('Error processing line:', line, err)
        // Fallback: just add as plain text
        paragraphs.push(new Paragraph({
          text: line,
          spacing: { after: 100 }
        }))
      }
    }
    
    // Add footer
    paragraphs.push(
      new Paragraph({
        text: '',
        spacing: { before: 300 }
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
    )
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }],
      numbering: {
        config: [{
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT
            }
          ]
        }]
      }
    })
    
    try {
      const fileName = `project_concept_${new Date().toISOString().slice(0, 10)}.docx`
      await downloadDocx(doc, fileName)
    } catch (err) {
      console.error('Failed to generate Word document:', err)
      throw new Error('Failed to generate Word document. Please try again.')
    }
  }
  
  return {
    exportToWord,
    exportConceptToWord
  }
}
