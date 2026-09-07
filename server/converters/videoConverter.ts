import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export class VideoConverter implements ConverterEngine {
  id = 'video-converter';
  name = 'FFmpeg Video Processing Engine';
  description = 'Video container transcoding, audio extraction, and thumbnail generation across MP4, WebM, MOV, AVI, and MKV.';

  supportedInputFormats = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'flv', 'wmv', '3gp'];
  supportedOutputFormats = ['mp4', 'webm', 'mov', 'avi', 'mp3', 'wav', 'png', 'jpg'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return this.supportedInputFormats.includes(inFmt) && this.supportedOutputFormats.includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    const fmt = inputFormat.toLowerCase();
    if (!fileBuffer || fileBuffer.length < 32) {
      return { valid: false, reason: 'Video file buffer is empty or too small.' };
    }

    if (fmt === 'mp4' || fmt === 'mov' || fmt === 'm4v') {
      const isFtyp = fileBuffer.subarray(4, 8).toString('utf8') === 'ftyp';
      const isMoov = fileBuffer.subarray(4, 8).toString('utf8') === 'moov';
      if (!isFtyp && !isMoov) {
        return { valid: false, reason: 'Invalid MP4/MOV: Missing ftyp or moov atom header.' };
      }
    } else if (fmt === 'webm' || fmt === 'mkv') {
      const isEbml = fileBuffer[0] === 0x1a && fileBuffer[1] === 0x45 && fileBuffer[2] === 0xdf && fileBuffer[3] === 0xa3;
      if (!isEbml) {
        return { valid: false, reason: 'Invalid WebM/MKV: Missing EBML header signature.' };
      }
    } else if (fmt === 'avi') {
      const isRiff = fileBuffer.subarray(0, 4).toString('utf8') === 'RIFF';
      const isAvi = fileBuffer.subarray(8, 12).toString('utf8') === 'AVI ';
      if (!isRiff || !isAvi) {
        return { valid: false, reason: 'Invalid AVI: Missing RIFF AVI container header.' };
      }
    }

    return { valid: true, detectedFormat: fmt };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, inputFormat, outputFormat, options } = params;
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    const tempId = crypto.randomUUID();
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `convertx_vid_in_${tempId}.${inFmt}`);
    const outputPath = path.join(tempDir, `convertx_vid_out_${tempId}.${outFmt}`);

    try {
      await fs.writeFile(inputPath, inputBuffer);

      const ffmpegArgs = ['-y', '-i', inputPath];

      // 1. Snapshot Thumbnail
      if (outFmt === 'png' || outFmt === 'jpg') {
        ffmpegArgs.push('-ss', '00:00:01', '-vframes', '1');
        if (options?.width) {
          ffmpegArgs.push('-vf', `scale=${options.width}:-1`);
        }
      }
      // 2. Audio Extraction
      else if (outFmt === 'mp3') {
        ffmpegArgs.push('-vn', '-c:a', 'libmp3lame', '-b:a', '192k');
      } else if (outFmt === 'wav') {
        ffmpegArgs.push('-vn', '-c:a', 'pcm_s16le');
      }
      // 3. Video Transcoding
      else if (outFmt === 'mp4') {
        ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k');
      } else if (outFmt === 'webm') {
        ffmpegArgs.push('-c:v', 'libvpx', '-crf', '24', '-b:v', '1M', '-c:a', 'libvorbis');
      } else if (outFmt === 'mov') {
        ffmpegArgs.push('-c:v', 'libx264', '-c:a', 'aac');
      } else if (outFmt === 'avi') {
        ffmpegArgs.push('-c:v', 'mpeg4', '-qscale:v', '3', '-c:a', 'mp3');
      }

      ffmpegArgs.push(outputPath);

      await new Promise<void>((resolve, reject) => {
        const proc = spawn('ffmpeg', ffmpegArgs);
        let stderr = '';
        proc.stderr.on('data', (d) => (stderr += d.toString()));
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg video processing failed (code ${code}): ${stderr.slice(-300)}`));
        });
        proc.on('error', (err) => reject(new Error(`Failed to start FFmpeg: ${err.message}`)));
      });

      const outputBuffer = await fs.readFile(outputPath);
      if (outputBuffer.length === 0) {
        throw new Error('Transcoded video output is empty.');
      }

      const mimeMap: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        png: 'image/png',
        jpg: 'image/jpeg',
      };

      return {
        buffer: outputBuffer,
        mimeType: mimeMap[outFmt] || 'application/octet-stream',
        outputExtension: outFmt,
      };
    } finally {
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    }
  }
}
