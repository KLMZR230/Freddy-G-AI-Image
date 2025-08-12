const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'El prompt es requerido.' }) };
    }

    // Use the API Key securely stored in Netlify's environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // This will be visible in the Function Log on Netlify
        console.error("GEMINI_API_KEY no está configurada en Netlify.");
        throw new Error("La configuración del servidor está incompleta.");
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    };

    const googleResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!googleResponse.ok) {
        const errorData = await googleResponse.json();
        console.error('Google API Error:', errorData);
        return { statusCode: googleResponse.status, body: JSON.stringify({ error: errorData.error?.message || 'Error en la API de Google.' }) };
    }

    const result = await googleResponse.json();
    const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

    if (!base64Data) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No se recibió una imagen de la API.' }) };
    }

    const imageUrl = `data:image/png;base64,${base64Data}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ imageUrl: imageUrl })
    };

  } catch (error) {
    console.error('Server-side error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Hubo un error en el servidor: ' + error.message })
    };
  }
};
