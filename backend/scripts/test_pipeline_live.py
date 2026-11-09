import asyncio
import json
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import get_settings
from app.infrastructure.ai.gemini_provider import GeminiAIProvider
from app.infrastructure.database.prisma_repository import PrismaSermonRepository
from app.use_cases.generate_outline import GenerateOutlineInputDTO, GenerateSermonOutlineUseCase


async def run_live_test():
    print("=" * 70)
    print("🧪 Teste E2E da Pipeline do Agente de IA para Pregações (Gemini Live)")
    print("=" * 70)

    settings = get_settings()
    sample_audio = backend_dir / "tests" / "sample_sermon.wav"

    if not sample_audio.exists():
        print("❌ Arquivo de áudio 'backend/tests/sample_sermon.wav' não encontrado!")
        return

    print(f"📁 Arquivo de áudio de teste: {sample_audio.name} ({sample_audio.stat().st_size} bytes)")
    print(f"🤖 Modelo Gemini: {settings.GEMINI_MODEL}")
    print("⏳ Enviando para a Google Gemini File API e extraindo estrutura teológica...")

    ai_provider = GeminiAIProvider(
        api_key=settings.GEMINI_API_KEY,
        model=settings.GEMINI_MODEL
    )
    repository = PrismaSermonRepository()
    use_case = GenerateSermonOutlineUseCase(ai_provider=ai_provider, repository=repository)

    input_dto = GenerateOutlineInputDTO(
        audio_path=sample_audio,
        original_filename="culto_solene_domingo.wav",
        mime_type="audio/wav",
        preacher="Pastor Samuel Mendes",
        custom_title="Culto de Adoração e Esperança"
    )

    try:
        sermon = await use_case.execute(input_dto)
        print("\n" + "=" * 70)
        print("🎉 SUCESSO! Esboço Teológico Gerado pela IA:")
        print("=" * 70)
        print(f"ID Gerado: {sermon.id}")
        print(f"Título: {sermon.title}")
        print(f"Pregador: {sermon.preacher}")
        print(f"Tema Central: {sermon.structured_content.tema}")
        print(f"\n📖 Introdução:\n{sermon.structured_content.introducao}")
        print(f"\n✝️ Pontos Principais ({len(sermon.structured_content.pontos_principais)} identificados):")
        for i, ponto in enumerate(sermon.structured_content.pontos_principais, 1):
            print(f"  {i}. {ponto.titulo}")
            print(f"     Explicação: {ponto.explicacao}")
            print(f"     Citação Bíblica: \"{ponto.referencia_biblica}\"")
        print(f"\n🕊️ Conclusão:\n{sermon.structured_content.conclusao}")
        print("=" * 70)
        print("Pipeline 100% validada e operacional!")

    except Exception as e:
        print(f"\n❌ Erro durante o processamento do áudio: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run_live_test())

