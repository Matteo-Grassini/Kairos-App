
// "Tactile Matte" Audio Engine
// Philosophy: "Sordo" (Dull/Muted), Minimal, Elegant.
// Tech: Low-frequency sine sweeps with aggressive Low-Pass Filtering.
// Result: Sounds like tapping a high-end rubberized button or matte plastic.

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;

const getContext = () => {
    if (!ctx) ctx = new AudioContext();
    return ctx;
};

// Helper for Haptics
const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

/**
 * Creates a dull, muted pulse (The "Sordo" effect)
 */
const playMutedPulse = (
    startFreq: number, 
    endFreq: number, 
    duration: number, 
    vol: number
) => {
    const context = getContext();
    const t = context.currentTime;

    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    // 1. Filter: The key to "Sordo". 
    // We cut everything above 800Hz to remove "brightness" and "clicks".
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t); 

    // 2. Oscillator: Sine wave (purest sound, no buzz)
    osc.type = 'sine';
    
    // 3. Pitch Envelope: A quick drop creates the physical "thud" sensation
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    // 4. Volume Envelope: Fast attack, fast decay. No resonance.
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.005); // 5ms attack (soft)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Routing
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    osc.start(t);
    osc.stop(t + duration + 0.05);
};

export const playSound = {
    // "Matte Tap" - Interaction
    // Very short, low frequency, dull. 
    // Feels like a premium physical button.
    click: () => {
        const context = getContext();
        if (context.state === 'suspended') context.resume();
        // Drop from 180Hz to 100Hz in 60ms. Very subtle.
        playMutedPulse(180, 100, 0.06, 0.2); 
        vibrate(10); // Light tap
    },

    // "Soft Glass" - Notification
    // Minimal sine wave, slightly higher pitch but still filtered to be elegant.
    notification: () => {
        const context = getContext();
        if (context.state === 'suspended') context.resume();
        
        // A gentle ping, not sharp.
        playMutedPulse(600, 600, 0.3, 0.1); 
        vibrate([50, 50, 50]); // Double tap
    },

    // "Quiet Flow" - Success
    // Two muted pulses blending together. Very understated.
    success: () => {
        const context = getContext();
        if (context.state === 'suspended') context.resume();
        
        // A minimal major chord hint (Root -> Third)
        playMutedPulse(300, 300, 0.15, 0.1);
        setTimeout(() => playMutedPulse(370, 370, 0.2, 0.1), 80);
        vibrate([30, 50, 30]); // Success ripple
    },

    // "Air Puff" - Delete
    // White noise heavily filtered. Sounds like a soft breath.
    delete: () => {
        const context = getContext();
        if (context.state === 'suspended') context.resume();
        const t = context.currentTime;

        const bufferSize = context.sampleRate * 0.2; // Short buffer
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = context.createBufferSource();
        source.buffer = buffer;
        
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t); // Very muffled

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);

        source.start(t);
        source.stop(t + 0.2);
        vibrate(20);
    },

    // "Low Wobble" - Error
    // A subtle low frequency vibration.
    error: () => {
        const context = getContext();
        if (context.state === 'suspended') context.resume();
        // Pitch wobble
        playMutedPulse(120, 110, 0.15, 0.2);
        vibrate([50, 100, 50]); // Stronger warning
    }
};
