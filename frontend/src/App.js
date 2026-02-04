import { useState } from "react"
import './App.css'
import AdminDashboard from './AdminDashboard'

function App() {
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Check if user is logged in and route accordingly
  const session = JSON.parse(localStorage.getItem('session') || '{}')
  const currentPath = window.location.pathname

  // If user is logged in as admin and on /admin route, show admin dashboard
  if (session.user && session.user.role === 'admin' && currentPath === '/admin') {
    return <AdminDashboard />
  }

  // If user is logged in as stakeholder and on /chat route, show chat (to be implemented)
  if (session.user && session.user.role === 'stakeholder' && currentPath === '/chat') {
    // Render the Chat component for stakeholders
    const Chat = require('./Chat').default
    return <Chat />
  }

  // If user is logged in as stakeholder and on /completion route, show completion report
  if (session.user && session.user.role === 'stakeholder' && currentPath === '/completion') {
    // Render the Completion component for stakeholders
    const Completion = require('./Completion').default
    return <Completion />
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      console.log("Attempting login for:", email)
      
      // Call API endpoint
      const response = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const session = await response.json()
      console.log("Login response status:", response.status)
      console.log("Login result:", session)

      if (!response.ok) {
        setError(session.error || "Invalid credentials or inactive account")
        setLoading(false)
        return
      }

      if (!session || !session.user) {
        setError("Invalid response from server")
        setLoading(false)
        return
      }

      console.log("User role:", session.user?.role)
      console.log("Assigned questionnaire:", session.user?.assignedQuestionnaireId)

      // Store session in localStorage
      localStorage.setItem("session", JSON.stringify(session))

      // Redirect based on role
      if (session.user?.role === "admin") {
        console.log("Redirecting admin to /admin")
        window.location.href = "/admin"
      } else {
        // For stakeholders, check if they have an assigned questionnaire
        if (session.user?.assignedQuestionnaireId) {
          console.log("Redirecting stakeholder to /chat")
          window.location.href = "/chat"
        } else {
          console.log("Stakeholder has no assigned questionnaire")
          setError("No questionnaire has been assigned to your account yet. Please contact your Business Analyst.")
          setLoading(false)
        }
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred. Please try again. Make sure Django backend is running on http://localhost:8000")
      setLoading(false)
    }
  }

  if (showLogin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FFFAF0 0%, #FFF4E6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(255, 107, 53, 0.2)',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '420px',
          borderTop: '6px solid #FF9500'
        }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Welcome Back
            </h1>
            <p style={{ color: '#999', margin: '0' }}>Sign in to access your questionnaire</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #FFE8D6',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(to right, #FFFAF0, white)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#FF9500';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 149, 0, 0.15)';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#FFE8D6';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #FFE8D6',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(to right, #FFFAF0, white)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#FF9500';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 149, 0, 0.15)';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#FFE8D6';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {error && (
              <div style={{
                fontSize: '0.9rem',
                color: '#D63230',
                background: 'linear-gradient(135deg, #FFF0F0 0%, #FFE8E8 100%)',
                padding: '1rem',
                borderRadius: '8px',
                border: '2px solid #FFD6D6'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#CCC' : 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)',
                color: 'white',
                fontWeight: '700',
                padding: '0.875rem 1rem',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.7 : 1,
                fontSize: '1rem',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(255, 107, 53, 0.3)'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-3px)', e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)')}
              onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)')}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => setShowLogin(false)}
              style={{
                width: '100%',
                color: '#FF9500',
                fontWeight: '600',
                padding: '0.875rem 1rem',
                borderRadius: '8px',
                border: '2px solid #FFE8D6',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#FFF4E6';
                e.target.style.borderColor = '#FF9500';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = '#FFE8D6';
              }}
            >
              Back to Home
            </button>
          </form>

          <div style={{
            marginTop: '1.75rem',
            padding: '1.25rem',
            background: 'linear-gradient(135deg, #FFF8F5 0%, #FFFAF0 100%)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#999',
            borderLeft: '3px solid #FF9500'
          }}>
            <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#FF9500', margin: '0 0 0.5rem 0' }}>Demo Credentials:</p>
            <p style={{ margin: '0.25rem 0' }}>Stakeholder: stakeholder@example.com</p>
            <p style={{ margin: '0.25rem 0' }}>Admin: admin@iicts.co.za</p>
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', margin: '0.75rem 0 0 0' }}>Password: admin123</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* Header */}
      <header style={{
        borderBottom: '2px solid #FFE8D6',
        backgroundColor: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 10px rgba(255, 107, 53, 0.08)'
      }}>
        <div style={{
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img 
              src="/izingcweti-logo.png" 
              alt="Izingcweti ICT Solutions Logo" 
              style={{ height: '48px', width: 'auto' }}
            />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0' }}>
              Izingcweti ICT Solutions
            </h1>
          </div>
          <button
            onClick={() => setShowLogin(true)}
            style={{
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)',
              color: 'white',
              fontWeight: '700',
              padding: '0.7rem 1.75rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.95rem',
              boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
            }}
            onMouseEnter={(e) => (e.target.style.transform = 'translateY(-3px)', e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)')}
            onMouseLeave={(e) => (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)')}
          >
            Client Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: '4rem 1.5rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '3.5rem',
          alignItems: 'center'
        }}>
          {/* Left Column */}
          <div>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
              lineHeight: '1.2',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Streamline Your <span style={{ color: '#FFD700' }}>Questionnaires</span>
            </h1>

            <p style={{
              fontSize: '1.1rem',
              color: '#666',
              marginBottom: '2rem',
              lineHeight: '1.8'
            }}>
              Our intelligent chatbot system makes stakeholder engagement simple and efficient. Create, distribute, and analyze questionnaires with ease while maintaining complete control over your data.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowLogin(true)}
                style={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)',
                  color: 'white',
                  fontWeight: '700',
                  padding: '1rem 2.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.05rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                }}
                onMouseEnter={(e) => (e.target.style.transform = 'translateY(-3px)', e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)')}
                onMouseLeave={(e) => (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)')}
              >
                Get Started
              </button>
              <button
                style={{
                  color: '#FF9500',
                  fontWeight: '700',
                  padding: '1rem 2.25rem',
                  borderRadius: '8px',
                  border: '2px solid #FF9500',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1.05rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#FFF8F5', e.target.style.transform = 'translateY(-3px)')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent', e.target.style.transform = 'translateY(0)')}
              >
                View Demo
              </button>
            </div>
          </div>

          {/* Right Column - Chat Preview */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(255, 107, 53, 0.15)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            borderTop: '5px solid #FF9500'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.35rem',
                  boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                }}>💬</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ backgroundColor: '#FFFAF0', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ color: '#4A3728', margin: '0', fontWeight: '500' }}>What is your primary business objective?</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)',
                color: 'white',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                maxWidth: '270px',
                boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
              }}>
                <p style={{ fontWeight: '500', margin: '0' }}>Increase market share by 25%</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.35rem',
                  boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                }}>💬</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ backgroundColor: '#FFFAF0', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ color: '#4A3728', margin: '0', fontWeight: '500' }}>What challenges are you facing?</p>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '2px solid #FFE8D6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#999', fontWeight: '500' }}>Question 2 of 10</span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#FFE8D6', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #FF6B35 0%, #FF9500 100%)',
                  height: '6px',
                  borderRadius: '9999px',
                  width: '20%'
                }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ backgroundColor: '#FFFAF0', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '3rem', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 3rem 0' }}>
            How It Works
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2rem'
          }}>
            {[
              { num: "1", title: "Secure Login", desc: "Receive unique credentials for your engagement" },
              { num: "2", title: "Answer Questions", desc: "Our chatbot guides you through the questionnaire" },
              { num: "3", title: "Save Progress", desc: "Pause anytime and return later" },
              { num: "4", title: "Get Confirmation", desc: "Receive notification when complete" },
            ].map((step) => (
              <div key={step.num} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  background: 'linear-gradient(135deg, #FFF4E6 0%, #FFFAF0 100%)',
                  color: '#FF9500',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  border: '3px solid #FFE8D6'
                }}>
                  {step.num}
                </div>
                <h4 style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '1.1rem', color: '#4A3728', margin: '0 0 0.5rem 0' }}>{step.title}</h4>
                <p style={{ fontSize: '0.9rem', color: '#999' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '4rem 1.5rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '3rem', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 3rem 0' }}>
            Why Choose Our Platform
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax: 280px, 1fr)',
            gap: '2.5rem'
          }}>
            {[
              { title: "Secure & Private", desc: "All responses are encrypted and stored securely." },
              { title: "Save Your Progress", desc: "Progress is automatically saved as you go." },
              { title: "Easy to Use", desc: "Simple interface with clear progress tracking." },
            ].map((feature) => (
              <div key={feature.title} style={{ display: 'flex', gap: '1rem', padding: '1.5rem', backgroundColor: '#FFFAF0', borderRadius: '8px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.25rem'
                }}>✓</div>
                <div>
                  <h4 style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#4A3728', margin: '0 0 0.5rem 0' }}>{feature.title}</h4>
                  <p style={{ fontSize: '0.9rem', color: '#999', margin: '0' }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section style={{ backgroundColor: '#FFFAF0', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
          <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.25rem', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 1.25rem 0' }}>
            Get in Touch
          </h3>
          <p style={{ textAlign: 'center', color: '#999', marginBottom: '3rem' }}>
            Interested in using our stakeholder engagement platform? Contact us today.
          </p>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 10px 30px rgba(255, 107, 53, 0.1)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax: 160px, 1fr)',
              gap: '2rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: '700', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 0.5rem 0' }}>📧 Email</p>
                <a href="mailto:info@izingcweti.co.za" style={{ color: '#FF9500', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.3s' }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecoration = 'underline';
                    e.target.style.color = '#FF6B35';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = 'none';
                    e.target.style.color = '#FF9500';
                  }}>
                  info@izingcweti.co.za
                </a>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: '700', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 0.5rem 0' }}>📞 Phone</p>
                <a href="tel:+27311096662" style={{ color: '#FF9500', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.3s' }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecoration = 'underline';
                    e.target.style.color = '#FF6B35';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = 'none';
                    e.target.style.color = '#FF9500';
                  }}>
                  031 109 6662
                </a>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: '700', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #FF6B35 0%, #FF9500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 0.5rem 0' }}>📍 Location</p>
                <p style={{ fontSize: '0.9rem', color: '#999', margin: '0' }}>14 Timeball Boulevard, Durban</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '2px solid #FFE8D6',
        backgroundColor: 'white',
        padding: '2rem 1.5rem'
      }}>
        <div style={{
          maxWidth: '80rem',
          margin: '0 auto',
          textAlign: 'center',
          color: '#999',
          fontSize: '0.9rem'
        }}>
          <p>© 2025 Izingcweti ICT Solutions. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
