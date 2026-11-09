import math
import struct
import wave
from pathlib import Path


def create_sample_wav(output_path: Path, duration_seconds: int = 3, sample_rate: int = 44100):
    """
    [DevSecOps / Teste] Gera um arquivo WAV de áudio válido utilizando apenas a biblioteca padrão do Python.
    Permite validar a pipeline de upload e a API do Gemini sem depender de gravações externas.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    num_samples = duration_seconds * sample_rate
    frequency = 440.0  # Tom de Lá (440 Hz)

    with wave.open(str(output_path), "w") as wav_file:
        # Canais: 1 (Mono), Largura de amostra: 2 bytes (16-bit), Taxa: 44100Hz
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for i in range(num_samples):
            # Onda senoidal com decaimento suave
            value = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * frequency * (i / sample_rate)))
            data = struct.pack("<h", value)
            wav_file.writeframesraw(data)

    print(f"Áudio de teste gerado com sucesso: {output_path} ({output_path.stat().st_size} bytes)")
    return output_path


if __name__ == "__main__":
    audio_path = Path(__file__).resolve().parent.parent / "tests" / "sample_sermon.wav"
    create_sample_wav(audio_path)

