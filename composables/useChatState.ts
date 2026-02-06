/**
 * Composable for managing AI chat interface state across page navigation
 */
export const useChatState = () => {
  const isOpen = useState('chat-is-open', () => false)
  
  return {
    isOpen
  }
}
