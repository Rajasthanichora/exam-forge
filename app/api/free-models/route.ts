import { NextRequest, NextResponse } from 'next/server';

type Provider = 'openrouter' | 'gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey } = body as { provider: Provider; apiKey?: string };

    if (!provider || (provider !== 'openrouter' && provider !== 'gemini')) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ models: [] });
    }

    if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return NextResponse.json({ error: err?.error?.message || 'Failed to fetch OpenRouter models' }, { status: response.status });
      }

      const payload = await response.json();
      const models = Array.isArray(payload?.data)
        ? payload.data
            .filter((model: any) => String(model?.id || '').endsWith(':free'))
            .map((model: any) => ({
              value: String(model.id),
              label: String(model.name || model.id),
            }))
            .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
        : [];

      return NextResponse.json({ models });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error?.message || 'Failed to fetch Gemini models' },
        { status: response.status }
      );
    }

    const payload = await response.json();
    const models = Array.isArray(payload?.models)
      ? payload.models
          .filter((model: any) => {
            const modelName = String(model?.name || '');
            const supportsGeneration = Array.isArray(model?.supportedGenerationMethods)
              ? model.supportedGenerationMethods.includes('generateContent')
              : false;
            return modelName.startsWith('models/gemini') && supportsGeneration;
          })
          .map((model: any) => {
            const fullName = String(model.name);
            const value = fullName.replace(/^models\//, '');
            return {
              value,
              label: String(model.displayName || value),
            };
          })
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
      : [];

    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
