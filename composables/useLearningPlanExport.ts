import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx'
import { saveAs } from 'file-saver'

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
    
    const blob = await Packer.toBlob(doc)
    const fileName = `${planTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_learning_plan.docx`
    saveAs(blob, fileName)
  }
  
  return {
    exportToWord
  }
}
