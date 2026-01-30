import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const { question, answer } = await req.json();

  if (!question || !answer) {
    return NextResponse.json({ error: 'Missing question or answer' }, { status: 400 });
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `You are a strict academic judge for law students. Your task is to evaluate an answer to a question. Respond in JSON format only.

Here's the question: """${question}"""
Here's the answer: """${answer}"""

First, check for spam or gibberish. If the answer is spam (e.g., "asdasd"), set 'is_spam' to true and 'score' to 0.
Second, check for any severe safety violations (e.g., hate speech, harassment, sexual content, dangerous content). If a severe violation is found, set 'severe_violation' to true and 'score' to 0.
Third, rate the accuracy and completeness of the answer on a scale of 0-100. Provide concise feedback.

Your output should be a JSON object with the following structure:
{
  "score": number, // 0-100, 0 if spam or severe violation
  "feedback": string,
  "is_spam": boolean,
  "severe_violation": boolean
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const parsedResponse = JSON.parse(text);
    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error judging answer:', error);
    return NextResponse.json({ error: 'Failed to judge answer' }, { status: 500 });
  }
}
