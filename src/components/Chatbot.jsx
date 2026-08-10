import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function Chatbot({ settings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ text: 'Hello! How can we help you today?', isBot: true }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInput('');
    setIsLoading(true);
    
    const chatbotConfig = settings?.chatbot || {};
    const apiKey = chatbotConfig.apiKey;
    const fallbackMessage = chatbotConfig.fallbackMessage || 'Thank you for your message. A representative will get back to you shortly.';

    if (!apiKey) {
      setTimeout(() => {
        setMessages(prev => [...prev, { text: fallbackMessage, isBot: true }]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const systemInstruction = `
${chatbotConfig.systemPrompt || 'You are a helpful assistant.'}

Here is the company Knowledge Base to use for answering questions:
${chatbotConfig.knowledgeBase || ''}
      `.trim();

      const history = messages.slice(1).map(msg => ({
        role: msg.isBot ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const botReply = response.text || fallbackMessage;
      setMessages(prev => [...prev, { text: botReply, isBot: true }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { text: fallbackMessage, isBot: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div 
        onClick={toggleChat}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'var(--gold-primary)',
          color: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--glow-shadow)',
          zIndex: 9999,
          fontSize: '24px',
          transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)'
        }}
      >
        💬
      </div>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '30px',
          width: '350px',
          height: '500px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--gold-primary)',
            color: 'var(--bg-secondary)',
            fontWeight: '600',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
              Live AI Support
            </div>
            <span style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={toggleChat}>✕</span>
          </div>
          
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: 'var(--bg-primary)'
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.isBot ? 'flex-start' : 'flex-end',
                backgroundColor: msg.isBot ? 'var(--bg-secondary)' : 'var(--gold-primary)',
                color: msg.isBot ? 'var(--text-primary)' : 'var(--bg-secondary)',
                padding: '12px 16px',
                borderRadius: '16px',
                borderBottomLeftRadius: msg.isBot ? '4px' : '16px',
                borderBottomRightRadius: msg.isBot ? '16px' : '4px',
                maxWidth: '85%',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                padding: '12px 16px',
                borderRadius: '16px',
                borderBottomLeftRadius: '4px',
                fontSize: '0.9rem',
                display: 'flex',
                gap: '4px',
                alignItems: 'center'
              }}>
                <div className="dot-flashing"></div>
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSend} style={{ display: 'flex', borderTop: '1px solid var(--border-subtle)', padding: '8px', backgroundColor: 'var(--bg-secondary)' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              style={{ 
                flex: 1, 
                padding: '12px 16px', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: '24px',
                outline: 'none', 
                background: 'var(--bg-primary)', 
                color: 'var(--text-primary)',
                marginRight: '8px'
              }}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              style={{ 
                padding: '0 20px', 
                backgroundColor: (isLoading || !input.trim()) ? 'var(--text-muted)' : 'var(--gold-primary)', 
                border: 'none', 
                borderRadius: '24px',
                color: 'var(--bg-secondary)', 
                cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer', 
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
