import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Build system prompt with context
    const systemPrompt = `You are a helpful technical support assistant helping to create troubleshooting solutions.

Context:
- Issue: ${context.issue}
- Brand: ${context.brand}
${context.vertical ? `- Vertical: ${context.vertical}` : ''}
${context.region ? `- Region: ${context.region}` : ''}

Your goal is to help create a clear, actionable troubleshooting solution. When the user provides enough information, generate a complete solution with:
1. A concise solution overview (2-3 sentences)
2. Step-by-step instructions (2-4 steps) when applicable

Format your response naturally in conversation. When you have enough information to create a complete solution, end your response with a clear summary that can be extracted.

If the user asks for a complete solution, provide it in this format:
SOLUTION_START
[Solution overview text]
STEPS_START
[Step 1]
[Step 2]
...
STEPS_END
SOLUTION_END`;

    // Convert messages to OpenAI format
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content || '';
    
    // Extract solution if present
    let solution: string | null = null;
    let steps: string[] = [];

    // Try to extract structured solution
    const solutionMatch = responseContent.match(/SOLUTION_START\s*([\s\S]*?)\s*STEPS_START/);
    const stepsMatch = responseContent.match(/STEPS_START\s*([\s\S]*?)\s*STEPS_END/);
    
    if (solutionMatch) {
      solution = solutionMatch[1].trim();
    }
    
    if (stepsMatch) {
      steps = stepsMatch[1]
        .split('\n')
        .map(step => step.trim())
        .filter(step => step.length > 0 && !step.match(/^\d+\./))
        .map(step => step.replace(/^[-*]\s*/, '').trim());
    }

    // If no structured format found, try to infer from the response
    if (!solution && responseContent.length > 50) {
      // Look for solution-like patterns
      const paragraphs = responseContent.split('\n\n').filter(p => p.trim().length > 20);
      if (paragraphs.length > 0) {
        solution = paragraphs[0];
      }
    }

    return NextResponse.json({
      response: responseContent,
      solution: solution || undefined,
      steps: steps.length > 0 ? steps : undefined,
    });
  } catch (error) {
    console.error('[conversational-ai] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

