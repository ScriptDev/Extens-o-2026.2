import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.domain.entities import Event, SermonOutline, StructuredContent, BiblicalPoint
from app.infrastructure.database.prisma_event_repository import PrismaEventRepository
from app.infrastructure.database.prisma_repository import PrismaSermonRepository


async def seed_data():
    print("=" * 70)
    print("🌱 Povoando Agenda Inteligente de Cultos com Dados Demonstrativos...")
    print("=" * 70)

    event_repo = PrismaEventRepository()
    sermon_repo = PrismaSermonRepository()

    now = datetime.now(timezone.utc)

    # 1. Evento Passado Já Documentado pela IA
    past_event_id = "a1111111-1111-1111-1111-111111111111"
    past_event = Event(
        id=past_event_id,
        title="Culto da Família - Domingo Passado",
        date=now - timedelta(days=3, hours=4),
        location="Templo Principal",
        theme="A Graça Redentora que Restaura o Lar",
        cover_image="https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=1000&auto=format&fit=crop"
    )

    # Esboço gerado pela IA para o culto passado
    structured_sermon = StructuredContent(
        tema="A Graça Redentora e a Reconciliação Familiar",
        introducao="O pregador abre a mensagem contextualizando a carta aos Efésios e destacando que a família é a primeira instituição criada por Deus na Terra.",
        pontos_principais=[
            BiblicalPoint(
                titulo="O Fundamento da Graça e do Perdão Mútuo",
                explicacao="Nenhuma família prospera na justiça própria; o lar é edificado na capacidade diária de perdoar como Cristo nos perdoou.",
                referencia_biblica="Efésios 4:32 - 'Antes, sede uns para com os outros benignos, compassivos, perdoando-vos uns aos outros, como também Deus vos perdoou em Cristo.'",
                aplicacao_pratica="Pratique o perdão intencional no casamento e com os filhos antes de dormir, eliminando ressentimentos."
            ),
            BiblicalPoint(
                titulo="A Paz de Cristo como Árbitro do Lar",
                explicacao="Quando conflitos surgirem, a decisão final deve sempre buscar a edificação e a paz que procedem de Jesus.",
                referencia_biblica="Colossenses 3:15 - 'Seja a paz de Cristo o árbitro em vossos corações, à qual, também, fostes chamados em um só corpo; e sede agradecidos.'",
                aplicacao_pratica="Em momentos de tensão familiar, pare e ore junto antes de tomar qualquer decisão ou responder no calor da discussão."
            )
        ],
        conclusao="O pastor encerra convidando as famílias ao altar para um momento de reconciliação, quebra de maldições hereditárias e renovação da aliança.",
        frases_de_impacto=[
            "O lar não é um tribunal de julgamentos, é um hospital da graça de Deus.",
            "Quem ama como Cristo perdoa antes mesmo de receber um pedido de desculpas."
        ],
        perguntas_discipulado=[
            "Qual área do seu relacionamento familiar mais necessita da manifestação da graça neste momento?",
            "Como você pode praticar o perdão ativo dentro da sua casa nesta semana?"
        ]
    )

    sermon = SermonOutline(
        id="b2222222-2222-2222-2222-222222222222",
        event_id=past_event_id,
        title="A Graça Redentora que Restaura o Lar",
        preacher="Pastor Luciano Subirá",
        audio_filename="culto_familia_domingo.mp3",
        media_type="audio",
        structured_content=structured_sermon,
        created_at=now - timedelta(days=3)
    )

    past_event.sermon = sermon

    await event_repo.save(past_event)
    await sermon_repo.save(sermon)
    print("✅ Culto Passado Documentado: 'Culto da Família' inserido com sucesso!")

    # 2. Evento Próximo (Culto de Jovens - Sábado)
    future_event_1 = Event(
        id="c3333333-3333-3333-3333-333333333333",
        title="Culto de Jovens: Conectados",
        date=now + timedelta(days=2, hours=3),
        location="Auditório Teen",
        theme="Identidade Inabalável em Tempos Líquidos",
        cover_image="https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1000&auto=format&fit=crop"
    )
    await event_repo.save(future_event_1)
    print("✅ Próximo Culto 1: 'Culto de Jovens: Conectados' agendado!")

    # 3. Evento Próximo (Santa Ceia - Domingo)
    future_event_2 = Event(
        id="d4444444-4444-4444-4444-444444444444",
        title="Culto de Celebração e Santa Ceia",
        date=now + timedelta(days=3, hours=4),
        location="Templo Principal",
        theme="O Memorial da Cruz e a Esperança da Glória",
        cover_image="https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1000&auto=format&fit=crop"
    )
    await event_repo.save(future_event_2)
    print("✅ Próximo Culto 2: 'Celebração e Santa Ceia' agendado!")

    print("=" * 70)
    print("🎉 Dados de demonstração inseridos com sucesso!")
    print("Acesse http://localhost:3000/events para visualizar a Agenda Inteligente!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(seed_data())

