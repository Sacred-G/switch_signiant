const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not set');
  throw new Error('RESEND_API_KEY environment variable is required');
}

const handler = async (req: Request): Promise<Response> => {
  // Log incoming request
  console.log('Received email request:', {
    method: req.method,
    url: req.url,
  });

  try {
    // Parse request body
    const body = await req.json().catch(error => {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid JSON body');
    });

    const { email, subject, message } = body;

    // Validate required fields
    if (!email || !subject || !message) {
      console.error('Missing required fields:', { email, subject, message });
      return new Response(
        JSON.stringify({
          error: 'Email, subject and message are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Sending email to:', email);
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Use Resend's default verified sender until domain is verified
        to: email,
        subject: subject,
        html: message,
      }),
    })

    const data = await res.json();
    console.log('Resend API response:', data);

    // Check if Resend returned an error
    if (data.error) {
      console.error('Resend API error:', data.error);
      return new Response(JSON.stringify({ error: data.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error in email handler:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

Deno.serve(handler)
