import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export class AudioConverter implements ConverterEngine {
  id = 'audio-converter';
  name = 'FFmpeg Audio Transcoding Engine';
  description = 'High-fidelity audio conversion across MP3, WAV, FLAC, M4A, AAC, OGG, OPUS, and AIFF.';

  supportedInputFormats = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'opus', 'aiff', 'aif', 'wma'];
  supportedOutputFormats = ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'opus', 'aiff'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase();
    return this.supportedInputFormats.includes(inFmt) && this.supportedOutputFormats.includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    const fmt = inputFormat.toLowerCase();
    if (!fileBuffer || fileBuffer.length < 16) {
      return { valid: false, reason: 'Audio file buffer is empty or corrupted.' };
    }

    if (fmt === 'mp3') {
      const hasId3 = fileBuffer[0] === 0x49 && fileBuffer[1] === 0x44 && fileBuffer[2] === 0x33;
      const hasSync = fileBuffer[0] === 0xff && (fileBuffer[1] & 0xe0) === 0xe0;
      if (!hasId3 && !hasSync) {
        return { valid: false, reason: 'Invalid MP3: Missing ID3 header or MPEG sync word.' };
      }
    } else if (fmt === 'wav') {
      const isRiff = fileBuffer.subarray(0, 4).toString('utf8') === 'RIFF';
      const isWave = fileBuffer.subarray(8, 12).toString('utf8') === 'WAVE';
      if (!isRiff || !isWave) {
        return { valid: false, reason: 'Invalid WAV: Missing RIFF WAVE header.' };
      }
    } else if (fmt === 'flac') {
      if (fileBuffer.subarray(0, 4).toString('utf8') !== 'fLaC') {
        return { valid: false, reason: 'Invalid FLAC: Missing fLaC magic bytes.' };
      }
    } else if (fmt === 'ogg' || fmt === 'opus') {
      if (fileBuffer.subarray(0, 4).toString('utf8') !== 'OggS') {
        return { valid: false, reason: 'Invalid OGG/Opus: Missing OggS container header.' };
      }
    }

    return { valid: true, detectedFormat: fmt };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, inputFormat, outputFormat, options } = params;
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase();

    const tempId = crypto.randomUUID();
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `convertx_in_${tempId}.${inFmt}`);
    const outputPath = path.join(tempDir, `convertx_out_${tempId}.${outFmt}`);

    try {
      await fs.writeFile(inputPath, inputBuffer);

      const ffmpegArgs = ['-y', '-i', inputPath];

      // Audio configuration
      if (outFmt === 'mp3') {
        ffmpegArgs.push('-c:a', 'libmp3lame');
        ffmpegArgs.push('-b:a', options?.bitrate || '192k');
      } else if (outFmt === 'wav') {
        ffmpegArgs.push('-c:a', 'pcm_s16le');
      } else if (outFmt === 'flac') {
        ffmpegArgs.push('-c:a', 'flac');
      } else if (outFmt === 'ogg') {
        ffmpegArgs.push('-c:a', 'libvorbis', '-q:a', '5');
      } else if (outFmt === 'opus') {
        ffmpegArgs.push('-c:a', 'libopus', '-b:a', options?.bitrate || '128k');
      } else if (outFmt === 'm4a') {
        ffmpegArgs.push('-c:a', 'aac', '-b:a', options?.bitrate || '192k');
      } else if (outFmt === 'aiff') {
        ffmpegArgs.push('-c:a', 'pcm_s16be');
      }

      if (options?.sampleRate) {
        ffmpegArgs.push('-ar', String(options.sampleRate));
      }
      if (options?.channels) {
        ffmpegArgs.push('-ac', String(options.channels));
      }

      ffmpegArgs.push(outputPath);

      await new Promise<void>((resolve, reject) => {
        const proc = spawn('ffmpeg', ffmpegArgs);
        let stderr = '';
        proc.stderr.on('data', (d) => (stderr += d.toString()));
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg audio conversion failed (code ${code}): ${stderr.slice(-300)}`));
        });
        proc.on('error', (err) => reject(new Error(`Failed to start FFmpeg: ${err.message}`)));
      });

      const outputBuffer = await fs.readFile(outputPath);
      if (outputBuffer.length === 0) {
        throw new Error('Transcoded audio output is empty.');
      }

      const mimeMap: Record<string, string> = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        flac: 'audio/flac',
        ogg: 'audio/ogg',
        opus: 'audio/opus',
        m4a: 'audio/mp4',
        aiff: 'audio/aiff',
      };

      return {
        buffer: outputBuffer,
        mimeType: mimeMap[outFmt] || 'application/octet-stream',
        outputExtension: outFmt,
      };
    } finally {
      // Ensure clean temp file cleanup
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    }
  }
}
