import React, { useState, useEffect } from 'react'

function Chat() {
  const [loading, setLoading] = useState(true)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const sessionStorage = JSON.parse(localStorage.getItem('session') || '{}')
  const token = sessionStorage.token
  const user = sessionStorage.user

  useEffect(() => {
    const init = async () => {
      if (!user || user.role !== 'stakeholder') {
        window.location.href = '/'
        return
      }

      try {
        // Get active session for current user
        const sessRes = await fetch('http://localhost:8000/api/users/me/session/', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        const sessJson = await sessRes.json()
        if (!sessRes.ok) throw new Error(sessJson.error || 'Failed to get session')

        if (!sessJson.id) {
          // No active session
          setLoading(false)
          setMessages([{ role: 'bot', content: 'No questionnaire assigned to your account.' }])
          return
        }

        setSession(sessJson)
        
        // Use the questionnaire data from session response
        const q = {
          id: sessJson.questionnaire_id,
          title: sessJson.questionnaire.title,
          description: sessJson.questionnaire.description,
          questions: sessJson.questions
        }
        setQuestionnaire(q)

        // Load previous responses
        const rRes = await fetch('http://localhost:8000/api/responses/', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const allResponses = await rRes.json()
        const prev = allResponses.filter(r => r.user_id === user.id && r.questionnaire_id === q.id)

        const msgs = [{ role: 'bot', content: `Hello ${user.name}! I'll guide you through the questionnaire.` }]

        if (prev.length > 0) {
          // Build Q&A from previous responses in order of questionnaire
          q.questions.forEach((question) => {
            const ans = prev.find(p => p.question_text === question.text)
            if (ans) {
              msgs.push({ role: 'bot', content: question.text })
              msgs.push({ role: 'user', content: ans.response })
            }
          })
        }

        if (!sessJson.is_completed && sessJson.current_question_index < q.questions.length) {
          msgs.push({ role: 'bot', content: q.questions[sessJson.current_question_index].text })
        } else if (sessJson.is_completed) {
          msgs.push({ role: 'bot', content: 'Thank you — you have completed this questionnaire.' })
        }

        setMessages(msgs)
      } catch (err) {
        console.error('Chat init error:', err)
        setMessages([{ role: 'bot', content: 'Failed to load chat. Please try again later.' }])
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const handleSubmit = async () => {
    if (!currentAnswer.trim() || !session || !questionnaire) return

    const currentQuestion = questionnaire.questions[session.current_question_index]

    try {
      // Create answer
      const res = await fetch(`http://localhost:8000/api/sessions/${session.id}/answers/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question_id: currentQuestion.id, answer_text: currentAnswer.trim() })
      })

      if (!res.ok) throw new Error('Failed to save answer')

      // Update session index
      const nextIndex = session.current_question_index + 1
      const completed = nextIndex >= questionnaire.questions.length

      const upd = await fetch(`http://localhost:8000/api/sessions/${session.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ current_question_index: nextIndex, is_completed: completed })
      })

      if (!upd.ok) console.warn('Failed to update session')

      const newMessages = [...messages, { role: 'user', content: currentAnswer.trim() }]

      if (completed) {
        newMessages.push({ role: 'bot', content: 'Thank you — you have completed the questionnaire.' })
        setSession({ ...session, current_question_index: nextIndex, is_completed: true })
        setMessages(newMessages)
        setCurrentAnswer('')

        // Exit chat interface after 2 seconds and redirect to completion page
        setTimeout(() => {
          window.location.href = '/completion'
        }, 2000)
      } else {
        const nextQ = questionnaire.questions[nextIndex]
        newMessages.push({ role: 'bot', content: nextQ.text })
        setSession({ ...session, current_question_index: nextIndex })
        setMessages(newMessages)
        setCurrentAnswer('')

        // scroll
        setTimeout(() => {
          const el = document.getElementById('chat-messages')
          if (el) el.scrollTop = el.scrollHeight
        }, 100)
      }

    } catch (err) {
      console.error('Submit error:', err)
      alert('Failed to submit your answer. Please try again.')
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FFFAF0 0%, #FFF4E6 100%)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '3px solid #FFE8D6', 
          borderTop: '3px solid #FF9500',
          borderRadius: '50%',
          margin: '0 auto 1rem',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#FF6B35', fontWeight: '600', fontSize: '1.1rem' }}>Loading chat...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFFAF0 0%, #FFF4E6 100%)' }}>
      {/* Main Header - Sticky at top */}
      <div style={{ 
        background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 50%, #FFD700 100%)',
        color: 'white',
        padding: '0.75rem 1.5rem',
        boxShadow: '0 4px 15px rgba(255, 107, 53, 0.2)',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src="/izingcweti-logo.png" 
            alt="Izingcweti ICT Solutions Logo" 
            style={{ height: '40px', width: 'auto', borderRadius: '6px', backgroundColor: 'white', padding: '5px' }}
          />
          <div>
            <h1 style={{ margin: '0', fontSize: '1.25rem', fontWeight: '700' }}>
              Izingcweti ICT Solutions
            </h1>
            <p style={{ margin: '0', fontSize: '0.85rem', opacity: 0.95 }}>
              Questionnaire - {questionnaire?.title || 'Loading...'}
            </p>
          </div>
        </div>
        {session && !session.is_completed && questionnaire && (
          <div style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '0.9rem',
            backdropFilter: 'blur(4px)'
          }}>
            Question {session.current_question_index + 1} of {questionnaire.questions.length}
          </div>
        )}
      </div>

      <div style={{ padding: '1.5rem' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 15px 50px rgba(255, 107, 53, 0.15)',
            overflow: 'hidden'
          }}>
            {/* Mini Header - Questionnaire Info with Progress */}
            {session && !session.is_completed && questionnaire && (
              <div style={{
                padding: '1rem 1.5rem',
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)',
                color: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h2 style={{ margin: '0', fontSize: '1.1rem', fontWeight: '600', color: 'white' }}>
                      {questionnaire.title}
                    </h2>
                    {questionnaire.description && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
                        {questionnaire.description}
                      </p>
                    )}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                    {session.current_question_index + 1} of {questionnaire.questions.length}
                  </div>
                </div>
                <div style={{
                  height: '4px',
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    backgroundColor: 'white',
                    width: `${((session.current_question_index + 1) / questionnaire.questions.length) * 100}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            )}
            {/* Chat Messages */}
            <div id="chat-messages" style={{
              height: '380px',
              overflowY: 'auto',
              padding: '1.5rem',
              background: 'linear-gradient(to bottom, #FFFAF0, #FFF8F5)'
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    maxWidth: '70%',
                    padding: '0.875rem 1.25rem',
                    borderRadius: '12px',
                    wordWrap: 'break-word',
                    background: m.role === 'user' ? 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)' : '#F0F0F0',
                    color: m.role === 'user' ? 'white' : '#4A3728',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    boxShadow: m.role === 'user' ? '0 4px 15px rgba(255, 107, 53, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                    fontWeight: m.role === 'user' ? '500' : '400'
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            {!session || session.is_completed ? (
              <div style={{
                padding: '2rem',
                backgroundColor: 'white',
                textAlign: 'center',
                borderTop: '1px solid #FFE8D6',
                background: 'linear-gradient(135deg, #FFF8F5 0%, white 100%)'
              }}>
                <p style={{ color: '#2E8B57', fontWeight: '700', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
                  ✓ Questionnaire Completed
                </p>
                <p style={{ color: '#999', fontSize: '0.9rem', margin: '0' }}>
                  Redirecting to completion report...
                </p>
              </div>
            ) : (
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'white',
                borderTop: '2px solid #FFE8D6',
                display: 'flex',
                gap: '1rem',
                background: 'linear-gradient(135deg, white 0%, #FFFAF0 100%)'
              }}>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
                  placeholder="Type your answer..."
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    border: '2px solid #FFE8D6',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    resize: 'none',
                    minHeight: '50px',
                    maxHeight: '120px',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease',
                    background: 'white'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FF9500';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 149, 0, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#FFE8D6';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button 
                  onClick={handleSubmit} 
                  disabled={!currentAnswer.trim()}
                  style={{
                    background: currentAnswer.trim() ? 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)' : '#CCC',
                    color: 'white',
                    border: 'none',
                    padding: '0.875rem 1.75rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: currentAnswer.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    minWidth: '110px',
                    boxShadow: currentAnswer.trim() ? '0 4px 15px rgba(255, 107, 53, 0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (currentAnswer.trim()) {
                      e.target.style.transform = 'translateY(-3px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    if (currentAnswer.trim()) {
                      e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
                    }
                  }}
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Chat
