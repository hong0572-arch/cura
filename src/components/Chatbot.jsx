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
        contactInfo: '일반 대화 기록 (익명)',
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
4. [CRITICAL RULE] IF the user provides an email address or phone number in the chat, YOU MUST EXPLICITLY CALL THE "sendAdminNotification" TOOL IMMEDIATELY. DO NOT just say "I will contact you". YOU MUST CALL THE TOOL FIRST!

Here is the company Knowledge Base to use for answering questions:
${chatbotConfig.knowledgeBase || ''}
      `.trim();

      const sendAdminNotificationDeclaration = {
        type: 'function',
        name: 'sendAdminNotification',
        description: 'Send an email to the administrator when a user leaves their contact information (phone number or email address).',
        parameters: {
          type: 'object',
          properties: {
            contactInfo: { type: 'string', description: 'The phone number or email address provided by the user.' },
            userContext: { type: 'string', description: 'A brief summary of what the user is asking about or needs help with.' }
          },
          required: ['contactInfo']
        }
      };

      const payload = {
        model: 'gemini-3.5-flash-lite',
        input: userMessage,
        tools: [sendAdminNotificationDeclaration]
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

      const lastStep = interaction.steps?.at(-1) || {};
      const functionCalls = lastStep.functionCalls || [];

      let botReply = interaction.output_text || interaction.text;

      if (functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'sendAdminNotification') {
          const { contactInfo, userContext } = call.args || {};

          try {
            // 이메일 전송 대신, 확실하게 파이어베이스 'inquiries' 컬렉션에 곧바로 저장
            await addDoc(collection(db, "inquiries"), {
              contactInfo: contactInfo,
              userContext: userContext || '연락처만 남김',
              createdAt: serverTimestamp(),
              status: "new" // 관리자가 아직 확인 안 한 상태
            });

            // AI에게 저장이 완료되었음을 알리고 답변 유도
            const toolResponsePayload = {
              model: 'gemini-3.5-flash-lite',
              previous_interaction_id: interaction.id,
              input: [{
                functionResponse: {
                  id: call.id,
                  name: call.name,
                  response: { status: 'OK', result: '성공적으로 관리자 시스템에 저장되었습니다. 고객에게 곧 연락드리겠다고 친절히 안내해주세요.' }
                }
              }]
            };
            interaction = await ai.interactions.create(toolResponsePayload);
            botReply = interaction.output_text || interaction.text;
          } catch (e) {
            console.error('파이어베이스 저장 실패:', e);
            botReply = "죄송합니다. 일시적인 시스템 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
          }
        }
      }

      botReply = botReply || fallbackMessage;

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
