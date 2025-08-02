import createClient from 'openapi-fetch';
import type { paths, operations } from '@voisync/types/voicevox';

const client = createClient<paths>({ 
  baseUrl: 'http://localhost:50021'
});

export type AudioQuery = operations['audio_query']['responses']['200']['content']['application/json'];

export interface VoiceVoxAPIError {
  detail: string;
}

export async function createAudioQuery(
  text: string, 
  speaker: number
): Promise<AudioQuery> {
  const { data, error } = await client.POST('/audio_query', {
    params: {
      query: {
        text,
        speaker,
        enable_katakana_english: true
      }
    }
  });

  if (error) {
    throw new Error(`Failed to create audio query: ${(error as VoiceVoxAPIError).detail || 'Unknown error'}`);
  }

  return data;
}

export async function synthesize(
  audioQuery: AudioQuery,
  speaker: number
): Promise<ArrayBuffer> {
  const { data, error, response } = await client.POST('/synthesis', {
    params: {
      query: {
        speaker,
        enable_interrogative_upspeak: true
      }
    },
    body: audioQuery,
    parseAs: 'arrayBuffer'
  });

  if (error || !response.ok) {
    throw new Error(`Failed to synthesize audio: ${response.statusText || 'Unknown error'}`);
  }

  return data as ArrayBuffer;
}

export interface Speaker {
  name: string;
  speaker_uuid: string;
  styles: Array<{
    name: string;
    id: number;
  }>;
}

export async function getSpeakers(): Promise<Speaker[]> {
  const { data, error } = await client.GET('/speakers');

  if (error) {
    throw new Error(`Failed to get speakers: ${(error as VoiceVoxAPIError).detail || 'Unknown error'}`);
  }

  return data as Speaker[];
}