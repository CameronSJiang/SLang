/**
 * Anthropic provider (bring-your-own key). Runs in the background service
 * worker or an extension page, never in a content script, so the key never
 * touches the host page.
 */
import Anthropic from '@anthropic-ai/sdk';
import { annotateWithJson, translateWithJson, type JsonCompleter } from './prompted';
import { InvalidResponseError, ProviderUnavailableError, type LLMProvider } from './types';

export const ANTHROPIC_MODEL = 'claude-haiku-5-5';

export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic' as const;
  readonly chunkSize = 30;
  private readonly client: Anthropic;

  constructor(private readonly apiKey: string) {
    // dangerouslyAllowBrowser sends `anthropic-dangerous-direct-browser-access: true`.
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  }

  async available(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  private complete: JsonCompleter = async (system, user, schema) => {
    let res: Anthropic.Message;
    try {
      res = await this.client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 16000,
        system,
        messages: [{ role: 'user', content: user }],
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      });
    } catch (e) {
      if (
        e instanceof Anthropic.AuthenticationError ||
        e instanceof Anthropic.PermissionDeniedError
      ) {
        throw new ProviderUnavailableError('Anthropic rejected the API key');
      }
      if (e instanceof Anthropic.NotFoundError) {
        throw new ProviderUnavailableError(`Model ${ANTHROPIC_MODEL} is not available to this key`);
      }
      throw e; // rate limits / network: SDK already retried; the annotator retries once more
    }
    if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') {
      throw new InvalidResponseError(`Response stopped: ${res.stop_reason}`);
    }
    const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
    if (!text) throw new InvalidResponseError('Empty response');
    try {
      return JSON.parse(text);
    } catch {
      throw new InvalidResponseError('Response was not JSON');
    }
  };

  annotate: LLMProvider['annotate'] = (cues, ctx) =>
    annotateWithJson(this.complete, cues, ctx, true);

  translateCues: LLMProvider['translateCues'] = (cues, from, to) =>
    translateWithJson(this.complete, cues, from, to);

  async translateLine(text: string, from: string, to: string): Promise<string> {
    const [cue] = await this.translateCues([{ id: 'l', start: 0, end: 0, text }], from, to);
    return cue?.text ?? '';
  }
}
