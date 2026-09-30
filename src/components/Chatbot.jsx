import { db } from '../firebase'; // 경로가 다르면 '../firebase' 로 맞추어 주세요.
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useNavigate } from 'react-router-dom';


export default function Chatbot({ settings, lang }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ text: lang === 'ko' ? '안녕하세요! 저는 여러분의 안내를 도울 Q라고 합니다. 무엇을 도와드릴까요?' : "Hello! I'm Q, your virtual assistant. How can I help you today?", isBot: true }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIdentified, setIsIdentified] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', contact: '' });

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Update greeting when language changes if no history yet
  useEffect(() => {
    if (messages.length === 1 && messages[0].isBot) {
      setMessages([{ text: lang === 'ko' ? '안녕하세요! 저는 여러분의 안내를 도울 Q라고 합니다. 무엇을 도와드릴까요?' : "Hello! I'm Q, your virtual assistant. How can I help you today?", isBot: true }]);
    }
  }, [lang]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInput('');
    setIsLoading(true);
    // --- [추가] 무조건 대화 기록 저장 ---
    try {
      await addDoc(collection(db, "inquiries"), {
        contactInfo: `${userInfo.name} (${userInfo.contact})`,
        userContext: userMessage,
        createdAt: serverTimestamp(),
        status: "new"
      });
    } catch (e) { console.error(e); }
    // ------------------------------------


    const chatbotConfig = settings?.chatbot || {};
    const apiKey = chatbotConfig.apiKey;
    const fallbackMessage = lang === 'ko'
      ? '감사합니다. 자세한 안내를 위해 이메일이나 전화번호 등 연락처를 남겨주시면 담당자가 신속히 답변해 드리겠습니다.'
      : (chatbotConfig.fallbackMessage || 'Thank you for your message. Please leave your contact information for a detailed response.');

    if (!apiKey) {
      setTimeout(() => {
        setMessages(prev => [...prev, { text: fallbackMessage, isBot: true }]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        apiVersion: 'v1'
      });

      const languageInstruction = 'IMPORTANT: Always reply in the exact language the user uses (e.g., if the user asks in English, reply in English; if Korean, reply in Korean).';

      const systemInstruction = `
Your name is 'Q'. Always refer to yourself as 'Q' when interacting with users.
${chatbotConfig.systemPrompt || 'You are a helpful assistant.'}
${languageInstruction}

IMPORTANT GUIDANCE:
1. ALWAYS keep your responses very concise and short (1-2 sentences max). Avoid long paragraphs.
2. If the user asks about booking, making a reservation, or pricing, naturally guide them to use our reservation page by providing this link formatted exactly as markdown: "[Book](/)" (or "[예약하기](/)" if in Korean).
3. ALWAYS try to answer the user's questions using the Knowledge Base. 

Here is the company Knowledge Base to use for answering questions:
${chatbotConfig.knowledgeBase || ''}
      `.trim();

      const payload = {
        model: 'gemini-2.5-flash',
        input: userMessage
      };

      if (messages.length > 2 && window.lastInteractionId) {
        payload.previous_interaction_id = window.lastInteractionId;
      } else {
        // First turn: Inject system instruction into the prompt
        payload.input = `[System Instructions]\n${systemInstruction}\n\n[User Message]\n${userMessage}`;
      }

      let interaction = await ai.interactions.create(payload);

      if (interaction.id) {
        window.lastInteractionId = interaction.id;
      }

      let botReply = interaction.output_text || interaction.text || fallbackMessage;

      setMessages(prev => [...prev, { text: botReply, isBot: true }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      const errorMsg = `Error: ${error.message || 'API request failed'}. Please check your API key and network.`;
      setMessages(prev => [...prev, { text: errorMsg, isBot: true }]);
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
              Q (Live AI Support)
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
            {messages.map((msg, idx) => {
              const renderText = (text) => {
                if (!text) return null;
                const parts = text.split(/(\[.*?\]\(.*?\))/g);
                return parts.map((part, index) => {
                  const match = part.match(/\[(.*?)\]\((.*?)\)/);
                  if (match) {
                    return (
                      <span
                        key={index}
                        onClick={() => {
                          navigate(match[2]);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{
                          color: msg.isBot ? 'var(--gold-primary)' : '#fff',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {match[1]}
                      </span>
                    );
                  }
                  return <span key={index}>{part}</span>;
                });
              };

              return (
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
                  {renderText(msg.text)}
                </div>
              );
            })}
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

          {isIdentified ? (
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
          ) : (
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px', backgroundColor: 'var(--bg-secondary)' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                {lang === 'ko' ? '상담을 위해 이름과 연락처를 남겨주세요.' : 'Please leave your contact info to start chatting.'}
              </p>
              <input
                type="text"
                placeholder={lang === 'ko' ? '이름' : 'Name'}
                value={userInfo.name}
                onChange={e => setUserInfo(prev => ({...prev, name: e.target.value}))}
                style={{ width: '100%', padding: '10px', marginBottom: '8px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
              />
              <input
                type="text"
                placeholder={lang === 'ko' ? '연락처 (이메일 또는 전화번호)' : 'Email or Phone'}
                value={userInfo.contact}
                onChange={e => setUserInfo(prev => ({...prev, contact: e.target.value}))}
                style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
              />
              <button
                onClick={() => {
                  if(userInfo.name.trim() && userInfo.contact.trim()) {
                    setIsIdentified(true);
                  } else {
                    alert(lang === 'ko' ? '이름과 연락처를 모두 입력해주세요.' : 'Please fill in both name and contact info.');
                  }
                }}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--gold-primary)', color: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {lang === 'ko' ? '대화 시작하기' : 'Start Chat'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
