/**
 * YouTube Video Widget for DecapCMS
 * Provides an enhanced input for YouTube videos with live preview
 */

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
  if (!url) return '';
  
  // Already just an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  // Various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*?v=([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return '';
}

// Create the YouTube widget control (the input field)
const YouTubeControl = window.createClass({
  getInitialState() {
    return {
      videoId: extractYouTubeId(this.props.value || ''),
      inputValue: this.props.value || ''
    };
  },

  handleChange(e) {
    const inputValue = e.target.value;
    const videoId = extractYouTubeId(inputValue);
    
    this.setState({ inputValue, videoId });
    this.props.onChange(videoId);
  },

  render() {
    const { forID, classNameWrapper } = this.props;
    const { inputValue, videoId } = this.state;
    
    return window.h(
      'div',
      { className: classNameWrapper },
      [
        // Input field
        window.h('input', {
          key: 'input',
          id: forID,
          className: 'nc-controlPane-control',
          type: 'text',
          value: inputValue,
          onChange: this.handleChange,
          placeholder: 'Enter YouTube URL or video ID (e.g., dQw4w9WgXcQ)',
          style: {
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '12px'
          }
        }),
        
        // Help text
        window.h('div', {
          key: 'help',
          style: {
            fontSize: '12px',
            color: '#666',
            marginBottom: '12px'
          }
        }, 'Paste any YouTube URL (youtube.com/watch?v=... or youtu.be/...) or just the video ID'),
        
        // Video preview
        videoId && window.h('div', {
          key: 'preview',
          style: {
            border: '2px solid #ff0000',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#000',
            position: 'relative',
            paddingBottom: '56.25%', // 16:9 aspect ratio
            height: 0
          }
        }, [
          window.h('iframe', {
            key: 'iframe',
            src: `https://www.youtube.com/embed/${videoId}`,
            frameBorder: '0',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowFullScreen: true,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            }
          }),
          window.h('div', {
            key: 'id-display',
            style: {
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace'
            }
          }, `ID: ${videoId}`)
        ])
      ]
    );
  }
});

// Create the preview component (shown in the entry preview pane)
const YouTubePreview = window.createClass({
  render() {
    const videoId = this.props.value;
    
    if (!videoId) {
      return window.h('div', {
        style: {
          padding: '12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          color: '#999',
          textAlign: 'center'
        }
      }, 'No YouTube video selected');
    }
    
    return window.h('div', {
      style: {
        border: '2px solid #ff0000',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative',
        paddingBottom: '56.25%',
        height: 0
      }
    }, [
      window.h('iframe', {
        key: 'iframe',
        src: `https://www.youtube.com/embed/${videoId}`,
        frameBorder: '0',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowFullScreen: true,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }
      }),
      window.h('a', {
        key: 'link',
        href: `https://www.youtube.com/watch?v=${videoId}`,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: {
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          textDecoration: 'none',
          fontWeight: '500'
        }
      }, '▶ Open in YouTube')
    ]);
  }
});

// Register the widget with DecapCMS
window.CMS.registerWidget('youtube', YouTubeControl, YouTubePreview);

console.log('✅ YouTube widget registered successfully');
