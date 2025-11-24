import { NextRequest, NextResponse } from 'next/server';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // Validate AWS credentials
    if (!region || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    if (
      accessKeyId === 'your_access_key_id_here' ||
      secretAccessKey === 'your_secret_access_key_here'
    ) {
      return NextResponse.json(
        { error: 'AWS credentials not configured properly' },
        { status: 500 }
      );
    }

    // Initialize Polly client
    const pollyClient = new PollyClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Create the synthesis command
    // Using Spanish (Mexico) neural voice for better quality
    const command = new SynthesizeSpeechCommand({
      Engine: 'neural', // Neural engine for more natural voice
      LanguageCode: 'es-US', // Spanish (United States)
      VoiceId: 'Lupe', // Lupe is a female neural voice for es-US
      OutputFormat: 'mp3', // MP3 format is more efficient than WAV
      Text: text,
      TextType: 'text',
      // Optional: Add prosody for a more natural, friendly tone
      // This is done via SSML if needed in the future
    });

    // Execute the synthesis
    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      return NextResponse.json(
        { error: 'No audio data received from Amazon Polly' },
        { status: 500 }
      );
    }

    // Convert the audio stream to a buffer
    const audioBuffer = await streamToBuffer(response.AudioStream);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);

    // More detailed error logging for AWS errors
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to convert a ReadableStream to Buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
