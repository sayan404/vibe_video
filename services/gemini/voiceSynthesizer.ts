import { writeFile } from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";
import { spawn } from "node:child_process";

export interface VoiceoverOptions {
    apiKey?: string;
    model?: string;
    voice?: string;
    provider?: "gemini" | "gtts" | "windows" | "deepgram" | "openai";
}

/**
 * Service to synthesize text into an audio file.
 * Supports Gemini (AI), Google Translate (Easiest/Free), and Windows Native (Offline).
 */
export async function synthesizeVoiceover(
    text: string,
    outputPath: string,
    options: VoiceoverOptions = {}
): Promise<string> {
    const provider = options.provider ?? (process.env.TTS_PROVIDER as any) ??
        (process.env.DEEPGRAM_API_KEY ? "deepgram" :
            process.env.OPENAI_API_KEY ? "openai" : "gtts");

    // Clean up text
    const cleanText = text.replace(/Frame \d+:[^\n]*/g, "").trim();

    if (provider === "gemini") {
        return await synthesizeVoiceoverGemini(cleanText, outputPath, options);
    } else if (provider === "windows") {
        return await synthesizeVoiceoverWindows(cleanText, outputPath);
    } else if (provider === "deepgram") {
        return await synthesizeVoiceoverDeepgram(cleanText, outputPath, options);
    } else if (provider === "openai") {
        return await synthesizeVoiceoverOpenAI(cleanText, outputPath, options);
    } else {
        // Default to gTTS
        return await synthesizeVoiceoverGTTS(cleanText, outputPath);
    }
}

async function synthesizeVoiceoverGemini(text: string, outputPath: string, options: VoiceoverOptions) {
    console.log(`[VoiceSynthesizer] Synthesizing with Gemini AI...`);
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing for Gemini provider.");

    const modelId = options.model ?? "gemini-2.0-flash";
    const ai = new GoogleGenAI({ apiKey });

    const resp = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: `Generate a narration for the following text: ${text}` }] }],
        config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: options.voice ?? "Aoede" } } }
        } as any
    });

    const data = resp.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
    if (!data) throw new Error("Gemini response missing audio data.");

    await writeFile(outputPath, Buffer.from(data, "base64"));
    console.log(`[VoiceSynthesizer] ✓ Gemini voiceover saved.`);
    return outputPath;
}

async function synthesizeVoiceoverGTTS(text: string, outputPath: string) {
    console.log(`[VoiceSynthesizer] Synthesizing with Google Translate (gTTS)...`);

    // Split text into chunks of max 200 characters (limit for this endpoint)
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const word of words) {
        if ((currentChunk + " " + word).length > 200) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = word;
        } else {
            currentChunk += (currentChunk ? " " : "") + word;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    console.log(`[VoiceSynthesizer] Splitting into ${chunks.length} chunks...`);

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=en&client=tw-ob`;
        const resp = await fetch(url);
        if (!resp.ok) {
            console.warn(`[VoiceSynthesizer] Chunk failed (${resp.status}): ${chunk.substring(0, 20)}...`);
            continue;
        }
        buffers.push(Buffer.from(await resp.arrayBuffer()));
    }

    if (buffers.length === 0) throw new Error("gTTS failed to generate any audio chunks.");

    const finalBuffer = Buffer.concat(buffers);
    await writeFile(outputPath, finalBuffer);
    console.log(`[VoiceSynthesizer] ✓ gTTS voiceover saved (${finalBuffer.length} bytes).`);
    return outputPath;
}

async function synthesizeVoiceoverWindows(text: string, outputPath: string) {
    console.log(`[VoiceSynthesizer] Synthesizing with Windows Native (SAPI)...`);
    return new Promise<string>((resolve, reject) => {
        // PowerShell script to use System.Speech
        const psScript = `
            Add-Type -AssemblyName System.Speech;
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
            $synth.SetOutputToWaveFile('${outputPath.replace(/\.mp3$/, ".wav")}');
            $synth.Speak("${text.replace(/"/g, '`"').replace(/\$/g, '`$')}");
            $synth.Dispose();
        `;

        const child = spawn("powershell", ["-Command", psScript]);
        child.on("close", (code) => {
            if (code === 0) {
                console.log(`[VoiceSynthesizer] ✓ Windows voiceover saved (as WAV).`);
                resolve(outputPath.replace(/\.mp3$/, ".wav"));
            } else {
                reject(new Error(`Windows TTS failed with code ${code}`));
            }
        });
    });
}

async function synthesizeVoiceoverDeepgram(text: string, outputPath: string, options: VoiceoverOptions) {
    console.log(`[VoiceSynthesizer] Synthesizing with Deepgram...`);
    const apiKey = options.apiKey ?? process.env.DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error("DEEPGRAM_API_KEY missing.");

    const model = options.model ?? "aura-asteria-en";
    const url = `https://api.deepgram.com/v1/speak?model=${model}`;

    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Token ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
    });

    if (!resp.ok) throw new Error(`Deepgram failed: ${await resp.text()}`);

    const buffer = Buffer.from(await resp.arrayBuffer());
    await writeFile(outputPath, buffer);
    console.log(`[VoiceSynthesizer] ✓ Deepgram voiceover saved.`);
    return outputPath;
}

async function synthesizeVoiceoverOpenAI(text: string, outputPath: string, options: VoiceoverOptions) {
    console.log(`[VoiceSynthesizer] Synthesizing with OpenAI (tts-1)...`);
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing.");

    const model = options.model ?? "tts-1";
    const voice = options.voice ?? "onyx";

    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ model, input: text, voice })
    });

    if (!resp.ok) throw new Error(`OpenAI failed: ${await resp.text()}`);

    const buffer = Buffer.from(await resp.arrayBuffer());
    await writeFile(outputPath, buffer);
    console.log(`[VoiceSynthesizer] ✓ OpenAI voiceover saved.`);
    return outputPath;
}
