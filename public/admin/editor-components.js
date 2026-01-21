/**
 * Custom Editor Components for DecapCMS
 * Registers components that appear in the "+" menu when editing markdown
 */

CMS.registerEditorComponent({
  id: "youtube-video",
  label: "YouTube Video",
  fields: [
    {
      name: "id",
      label: "YouTube Video ID",
      widget: "string",
      hint: "Paste the YouTube video ID (e.g., dQw4w9WgXcQ) or full URL"
    },
    {
      name: "title",
      label: "Video Title",
      widget: "string",
      default: "Video Tutorial",
      required: false
    }
  ],
  pattern: /::youtube-video\{id="([^"]+)"(?:\s+title="([^"]*)")?\}\s*::/s,
  fromBlock: function(match) {
    return {
      id: match[1],
      title: match[2] || "Video Tutorial"
    };
  },
  toBlock: function(obj) {
    return `::youtube-video{id="${obj.id}" title="${obj.title || 'Video Tutorial'}"}
::`;
  },
  toPreview: function(obj) {
    return `
      <div style="border: 2px solid #ff0000; padding: 16px; margin: 16px 0; border-radius: 8px; background: #fff;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-size: 20px;">🎥</span>
          <strong style="color: #ff0000; font-size: 16px;">YouTube Video</strong>
        </div>
        <div style="position: relative; padding-bottom: 56.25%; height: 0; background: #000; border-radius: 4px; overflow: hidden;">
          <iframe 
            src="https://www.youtube.com/embed/${obj.id}" 
            frameborder="0" 
            allowfullscreen 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
          ></iframe>
        </div>
        <div style="color: #666; font-size: 13px; margin-top: 8px; text-align: center;">${obj.title || 'Video Tutorial'}</div>
      </div>
    `;
  }
});

CMS.registerEditorComponent({
  id: "iframe-component",
  label: "Video Embed (iframe)",
  fields: [
    {
      name: "src",
      label: "Video URL",
      widget: "string",
      hint: "Full YouTube, Vimeo, or other video URL"
    },
    {
      name: "title",
      label: "Video Title",
      widget: "string",
      default: "Video",
      required: false
    }
  ],
  // Support both formats: inline props AND YAML frontmatter
  pattern: /::iframe-component(?:\{src="([^"]+)"(?:\s+title="([^"]*)")?\}|[\s\n]+src:\s*([^\n]+)[\s\n]+title:\s*([^\n]+))\s*::/s,
  fromBlock: function(match) {
    // Inline format: match[1] and match[2]
    // YAML format: match[3] and match[4]
    return {
      src: match[1] || match[3] || '',
      title: match[2] || match[4] || 'Video'
    };
  },
  toBlock: function(obj) {
    return `::iframe-component{src="${obj.src}" title="${obj.title || 'Video'}"}
::`;
  },
  toPreview: function(obj) {
    return `
      <div style="border: 2px solid #4a90e2; padding: 16px; margin: 16px 0; border-radius: 8px; background: #f0f7ff;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 20px;">📹</span>
          <strong style="color: #4a90e2; font-size: 16px;">Video Embed</strong>
        </div>
        <div style="color: #333; margin-top: 8px; font-weight: 500;">${obj.title}</div>
        <div style="color: #666; font-size: 12px; margin-top: 4px; word-break: break-all;">${obj.src}</div>
      </div>
    `;
  }
});

CMS.registerEditorComponent({
  id: "google-slides",
  label: "Google Slides",
  fields: [
    {
      name: "id",
      label: "Presentation ID",
      widget: "string",
      hint: "The ID from the Google Slides URL (between /d/ and /edit)"
    },
    {
      name: "title",
      label: "Presentation Title",
      widget: "string",
      default: "Presentation",
      required: false
    }
  ],
  pattern: /::google-slides-component\{id="([^"]+)"(?:\s+title="([^"]*)")?\}\s*::/s,
  fromBlock: function(match) {
    return {
      id: match[1],
      title: match[2] || "Presentation"
    };
  },
  toBlock: function(obj) {
    return `::google-slides-component{id="${obj.id}" title="${obj.title || 'Presentation'}"}
::`;
  },
  toPreview: function(obj) {
    return `
      <div style="border: 2px solid #34a853; padding: 16px; margin: 16px 0; border-radius: 8px; background: #f0fff4;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 20px;">📊</span>
          <strong style="color: #34a853; font-size: 16px;">Google Slides</strong>
        </div>
        <div style="color: #333; margin-top: 8px; font-weight: 500;">${obj.title}</div>
        <div style="color: #666; font-size: 11px; margin-top: 4px; font-family: monospace;">ID: ${obj.id}</div>
      </div>
    `;
  }
});

CMS.registerEditorComponent({
  id: "rubric-component",
  label: "Assessment Rubric",
  fields: [
    {
      name: "id",
      label: "Rubric",
      widget: "select",
      options: ["exercise", "exercise-low-poly", "project", "task", "written-statement"],
      hint: "Select which rubric to display"
    }
  ],
  pattern: /::rubric-component\{id="([^"]+)"\}\s*::/s,
  fromBlock: function(match) {
    return {
      id: match[1]
    };
  },
  toBlock: function(obj) {
    return `::rubric-component{id="${obj.id}"}
::`;
  },
  toPreview: function(obj) {
    return `
      <div style="border: 2px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 8px; background: #fffbeb;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 20px;">📋</span>
          <strong style="color: #f59e0b; font-size: 16px;">Grading Rubric</strong>
        </div>
        <div style="color: #333; margin-top: 8px;">Rubric: <strong>${obj.id}</strong></div>
      </div>
    `;
  }
});

CMS.registerEditorComponent({
  id: "sketchfab-viewer",
  label: "Sketchfab Model",
  fields: [
    {
      name: "src",
      label: "Sketchfab URL",
      widget: "string",
      hint: "Paste the Sketchfab model URL (e.g., https://sketchfab.com/3d-models/...)"
    },
    {
      name: "title",
      label: "Model Title",
      widget: "string",
      default: "Sketchfab Model",
      required: false
    },
    {
      name: "height",
      label: "Viewer Height",
      widget: "string",
      default: "600px",
      required: false,
      hint: "CSS height value (e.g., 600px, 80vh)"
    }
  ],
  pattern: /::sketchfab-component\{src="([^"]+)"(?:\s+title="([^"]*)")?(?:\s+height="([^"]*)")?\}\s*::/s,
  fromBlock: function(match) {
    return {
      src: match[1],
      title: match[2] || "Sketchfab Model",
      height: match[3] || "600px"
    };
  },
  toBlock: function(obj) {
    return `::sketchfab-component{src="${obj.src}" title="${obj.title || 'Sketchfab Model'}" height="${obj.height || '600px'}"}
::`;
  },
  toPreview: function(obj) {
    return `
      <div style="border: 2px solid #1caad9; padding: 16px; margin: 16px 0; border-radius: 8px; background: #e8f7fb;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-size: 20px;">🎨</span>
          <strong style="color: #1caad9; font-size: 16px;">Sketchfab Model</strong>
        </div>
        <div style="background: #1a1a1a; border-radius: 8px; height: ${obj.height || '600px'}; display: flex; align-items: center; justify-content: center; color: #888; font-size: 14px;">
          <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 8px;">🎨</div>
            <div>${obj.title || 'Sketchfab Model'}</div>
            <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">Sketchfab embed preview</div>
          </div>
        </div>
        <div style="color: #666; font-size: 12px; margin-top: 8px; word-break: break-all;">
          <strong>URL:</strong> ${obj.src}
        </div>
      </div>
    `;
  }
});

CMS.registerEditorComponent({
  id: "threed-viewer",
  label: "3D Model (Upload)",
  fields: [
    {
      name: "src",
      label: "Upload 3D File",
      widget: "file",
      hint: "Upload .gltf or .glb file"
    },
    {
      name: "title",
      label: "Model Title",
      widget: "string",
      default: "3D Model",
      required: false
    },
    {
      name: "height",
      label: "Viewer Height",
      widget: "string",
      default: "600px",
      required: false,
      hint: "CSS height value (e.g., 600px, 80vh)"
    },
    {
      name: "autoRotate",
      label: "Auto-rotate model",
      widget: "boolean",
      default: true,
      required: false
    }
  ],
  pattern: /::threed-viewer-component\{src="([^"]+)"(?:\s+title="([^"]*)")?(?:\s+height="([^"]*)")?(?:\s+autoRotate="(true|false)")?\}\s*::/s,
  fromBlock: function(match) {
    return {
      src: match[1],
      title: match[2] || "3D Model",
      height: match[3] || "600px",
      autoRotate: match[4] === "false" ? false : true
    };
  },
  toBlock: function(obj) {
    const autoRotateStr = obj.autoRotate === false ? ' autoRotate="false"' : '';
    return `::threed-viewer-component{src="${obj.src}" title="${obj.title || '3D Model'}" height="${obj.height || '600px'}"${autoRotateStr}}
::`;
  },
  toPreview: function(obj) {
    const fileTypeLabel = obj.src.endsWith('.gltf') ? 'GLTF Model' : 'GLB Model';
    
    return `
      <div style="border: 2px solid #8b5cf6; padding: 16px; margin: 16px 0; border-radius: 8px; background: #faf5ff;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-size: 20px;">🎲</span>
          <strong style="color: #8b5cf6; font-size: 16px;">Uploaded 3D Model</strong>
          <span style="background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">${fileTypeLabel}</span>
        </div>
        <div style="background: #1a1a1a; border-radius: 8px; height: ${obj.height || '400px'}; display: flex; align-items: center; justify-content: center; color: #888; font-size: 14px;">
          <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 8px;">🎲</div>
            <div>${obj.title || '3D Model'}</div>
            <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">Interactive 3D viewer</div>
          </div>
        </div>
        <div style="color: #666; font-size: 12px; margin-top: 8px; word-break: break-all;">
          <strong>File:</strong> ${obj.src}
        </div>
        ${obj.autoRotate !== false ? '<div style="color: #666; font-size: 11px; margin-top: 4px;">⟳ Auto-rotate enabled</div>' : ''}
      </div>
    `;
  }
});

console.log('✅ Custom editor components registered: YouTube Video, Video Embed, Google Slides, Assessment Rubric, Sketchfab Model, 3D Model Upload');
