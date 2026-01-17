// Cloudflare Worker for Darpan AI Proxy (Academic/Research Focus)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    const body = await request.json()
    
    // Your Gemini API Key (store as secret in Cloudflare)
    const GEMINI_API_KEY = GEMINI_API_KEY_SECRET; // Set this as a secret in Cloudflare dashboard
    
    // Gemini API endpoint
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`
    
    // Format messages for Gemini
    const formattedMessages = formatMessagesForGemini(body.messages)
    
    // Create Gemini request
    const geminiRequest = {
      contents: formattedMessages,
      generationConfig: {
        temperature: body.temperature || 0.7,
        topP: body.top_p || 0.9,
        topK: 40,
        maxOutputTokens: 2048
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    }
    
    // Call Gemini API
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequest)
    })
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }
    
    const geminiResponse = await response.json()
    
    // Extract text from Gemini response
    const text = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, but I couldn't generate a response."
    
    // Return formatted response
    return new Response(JSON.stringify({
      response: {
        text: text,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
    
  } catch (error) {
    console.error('Worker error:', error)
    
    return new Response(JSON.stringify({
      error: 'Failed to process request',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
}

function formatMessagesForGemini(messages) {
  const formatted = []
  
  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'model') {
      formatted.push({
        role: msg.role,
        parts: [{ text: msg.parts[0].text }]
      })
    }
  }
  
  return formatted
}
