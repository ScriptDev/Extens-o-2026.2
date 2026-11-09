import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from google import genai
from google.genai import types

from app.config import get_settings
from app.infrastructure.database.connection_pool import get_pool
from app.presentation.schemas import StrategicInsightsResponseDTO, StrategicInsightItemDTO
from app.presentation.routers.teens_routes import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["IA de Auditoria Estratégica e Análise Temporal"])

settings = get_settings()


@router.get(
    "/strategic-insights",
    response_model=StrategicInsightsResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Gera Auditoria Estratégica e Análise Temporal por Papel RBAC com Google Gemini"
)
async def get_strategic_insights(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    IA Estratégica RBAC:
    - PASTORES / ADMIN: Auditoria da saúde dos ministérios com análise temporal (dias desde último evento,
      queda de atividade, risco de desmobilização e recomendações de alinhamento com líderes).
    - LÍDERES: Análise temporal da frequência dos membros (detecção de faltas consecutivas, cálculo de probabilidade
      de desengajamento e levantamento de causas: sobrecarga de tempo/estudos, trabalho, dificuldades pessoais/familiares).
    - MEMBROS (TEEN): Insights de crescimento e constância espiritual.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")

    role = current_user.get("role", "TEEN")
    user_name = current_user.get("name", "Usuário")
    user_id = str(current_user["id"])

    pool = await get_pool()
    now = datetime.now(timezone.utc)

    # --------------------------------------------------------------------------
    # 1. VISÃO DO PASTOR OU SUPER ADMIN (Auditoria de Ministérios & Linha Temporal)
    # --------------------------------------------------------------------------
    if role in ["PASTOR", "ADMIN"]:
        ministries_data = []
        if pool:
            async with pool.acquire() as conn:
                ministries = await conn.fetch("SELECT id, name, kanji_symbol, primary_color FROM public.ministries ORDER BY name")
                for m in ministries:
                    min_id = m["id"]
                    # Busca eventos desse ministério
                    last_event = await conn.fetchrow("""
                        SELECT date, title FROM public.events 
                        WHERE ministry_id = $1 AND date <= $2 
                        ORDER BY date DESC LIMIT 1;
                    """, min_id, now)

                    next_event = await conn.fetchrow("""
                        SELECT date, title FROM public.events 
                        WHERE ministry_id = $1 AND date > $2 
                        ORDER BY date ASC LIMIT 1;
                    """, min_id, now)

                    # Conta membros vinculados ao ministério
                    members_count = await conn.fetchval("""
                        SELECT COUNT(*) FROM public.users 
                        WHERE active = true AND ministries::text ILIKE $1;
                    """, f"%{min_id}%")

                    days_inactive = (now - last_event["date"]).days if last_event else 45
                    ministries_data.append({
                        "id": str(min_id),
                        "name": m["name"],
                        "kanji": m["kanji_symbol"],
                        "last_event_title": last_event["title"] if last_event else "Nenhum evento registrado",
                        "last_event_date": last_event["date"].strftime("%d/%m/%Y") if last_event else "Sem registro",
                        "days_inactive": days_inactive,
                        "has_future_event": next_event is not None,
                        "members_count": members_count or 1,
                    })

        # Prepara chamada ao Gemini
        prompt = f"""Você é o Conselheiro Estratégico Sênior e Especialista em Crescimento de Igrejas e Ministério de Jovens da Agenda Teens.
Analise a saúde temporal dos seguintes ministérios da igreja para apresentar um briefing analítico ao Pastor Titular ({user_name}):

DADOS DA LINHA TEMPORAL:
{json.dumps(ministries_data, indent=2, ensure_ascii=False)}

DIRETRIZES DA ANÁLISE:
1. Se um ministério estiver há mais de 15 dias sem atividades, classifique com severidade "high_concern" (Grande Preocupação), indicando risco de desmotivação do líder e dispersão dos membros.
2. Analise a causa temporal (ex: ministério sem agenda futura prevista, falta de planejamento litúrgico).
3. Forneça uma recomendação acionável e acolhedora para o Pastor conversar com o líder e reaquecer o grupo.
4. Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{{
  "summary": "Resumo geral da saúde e constância eclesiástica",
  "insights": [
    {{
      "target_id": "UUID do ministério",
      "target_name": "Nome do ministério",
      "category": "ministry_inactivity",
      "severity": "high_concern" | "warning" | "positive",
      "days_inactive": 25,
      "inactivity_rate": 82.5,
      "title": "Alerta de Estagnação / Inatividade Crítica",
      "observation": "Ministério sem encontros há 25 dias e sem evento futuro programado.",
      "temporal_analysis": "O último evento ocorreu em [data]. O hiato temporal prolongado enfraquece o senso de comunidade.",
      "probable_causes": ["Sobrecarga do líder", "Falta de planejamento semestral", "Dificuldade de engajar adolescentes"],
      "action_plan": "Agendar reunião de alinhamento com o líder responsável e traçar plano de 3 novos encontros."
    }}
  ]
}}"""

        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3
                )
            )
            data = json.loads(response.text)
            insights = [StrategicInsightItemDTO(**i) for i in data.get("insights", [])]
            return StrategicInsightsResponseDTO(
                role="PASTOR",
                user_name=user_name,
                summary=data.get("summary", "Auditoria temporal eclesiástica concluída com sucesso."),
                insights=insights,
                generated_at=now
            )
        except Exception as e:
            logger.error(f"Erro na geração de insights pastorais via Gemini: {e}")
            # Fallback determinístico profissional
            fallback_insights = []
            for m in ministries_data:
                sev = "high_concern" if m["days_inactive"] >= 20 else ("warning" if m["days_inactive"] >= 10 else "positive")
                fallback_insights.append(StrategicInsightItemDTO(
                    target_id=m["id"],
                    target_name=m["name"],
                    category="ministry_inactivity",
                    severity=sev,
                    days_inactive=m["days_inactive"],
                    inactivity_rate=round(min(m["days_inactive"] * 3.5, 95.0), 1),
                    title=f"Auditoria Ministerial: {m['name']}",
                    observation=f"Última atividade registrada há {m['days_inactive']} dias ({m['last_event_title']}).",
                    temporal_analysis=f"O ministério conta com {m['members_count']} membro(s). A ausência de encontros recentes demanda contato proativo pastoral.",
                    probable_causes=["Sobrecarga do líder", "Falta de calendário definido", "Necessidade de apoio pastoral"],
                    action_plan="Conversar com a liderança para entender os impedimentos e traçar um cronograma de cultos mensais."
                ))
            return StrategicInsightsResponseDTO(
                role="PASTOR",
                user_name=user_name,
                summary="Relatório de monitoramento da saúde ministerial gerado pelo motor de inteligência eclesiástica.",
                insights=fallback_insights,
                generated_at=now
            )

    # --------------------------------------------------------------------------
    # 2. VISÃO DO LÍDER (Acompanhamento Individual de Membros & Frequência)
    # --------------------------------------------------------------------------
    elif role == "LEADER":
        members_data = []
        if pool:
            async with pool.acquire() as conn:
                # Busca ministérios desse líder
                user_row = await conn.fetchrow("SELECT ministries FROM public.users WHERE id = $1", uuid.UUID(user_id))
                leader_mins = json.loads(user_row["ministries"]) if user_row and user_row.get("ministries") else []
                min_ids = [m["id"] for m in leader_mins if "id" in m]

                # Busca membros adolescentes que tenham tag ou pertençam a esses ministérios
                teens = await conn.fetch("SELECT id, name, tags, phone, parent_name FROM public.users WHERE role = 'TEEN' AND active = true")
                
                # Busca os últimos 5 eventos criados ou do ministério
                recent_events = await conn.fetch("""
                    SELECT id, title, date FROM public.events 
                    WHERE status = 'published' AND date <= $1 
                    ORDER BY date DESC LIMIT 4;
                """, now)
                
                for t in teens:
                    teen_id = t["id"]
                    attendances = await conn.fetch("""
                        SELECT event_id, status FROM public.event_attendances 
                        WHERE user_id = $1;
                    """, teen_id)
                    att_event_ids = {a["event_id"] for a in attendances}
                    
                    missed_count = 0
                    for ev in recent_events:
                        if ev["id"] not in att_event_ids:
                            missed_count += 1

                    members_data.append({
                        "id": str(teen_id),
                        "name": t["name"],
                        "tags": json.loads(t["tags"]) if isinstance(t["tags"], str) else (t["tags"] or []),
                        "missed_consecutive": missed_count,
                        "total_recent_events": len(recent_events),
                    })

        prompt = f"""Você é o Mentor e Psicólogo Pastoral de Adolescentes da Agenda Teens.
Analise a frequência e histórico de faltas dos seguintes adolescentes sob os cuidados do Líder ({user_name}):

DADOS DE FREQUÊNCIA:
{json.dumps(members_data, indent=2, ensure_ascii=False)}

DIRETRIZES DA ANÁLISE:
1. Para cada membro com 2 ou mais faltas seguidas (ex: Carlos), gere um insight com severidade "high_concern" ou "warning".
2. Calcule uma probabilidade lógica de desengajamento (ex: 75% a 85%).
3. Mapeie causas prováveis empáticas e realistas (ex: sobrecarga com provas escolares/estudos, trabalho no fim de semana, desmotivação ou conflito/dificuldade familiar).
4. Sugira uma abordagem de contato carinhosa, sem julgamento, para que o líder envie uma mensagem ou ligue.
5. Responda em JSON:
{{
  "summary": "Resumo do engajamento dos membros do ministério",
  "insights": [
    {{
      "target_id": "UUID do adolescente",
      "target_name": "Nome do adolescente",
      "category": "member_absence",
      "severity": "high_concern" | "warning" | "positive",
      "days_inactive": 21,
      "inactivity_rate": 78.0,
      "title": "Atenção Pastoral ao Membro",
      "observation": "Ausente nos últimos encontros do ministério.",
      "temporal_analysis": "O membro faltou a 3 encontros consecutivos na linha temporal recente.",
      "probable_causes": ["Sobrecarga escolar / Vestibular", "Trabalho em turnos alternados", "Isolamento ou dificuldades pessoais", "Falta de carona / transporte"],
      "action_plan": "Mande uma mensagem afetuosa no WhatsApp: 'Oi Carlos, sentimos muito sua falta no ensaio! Como estão as coisas por aí? Posso orar por você hoje?'"
    }}
  ]
}}"""

        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3
                )
            )
            data = json.loads(response.text)
            insights = [StrategicInsightItemDTO(**i) for i in data.get("insights", [])]
            return StrategicInsightsResponseDTO(
                role="LEADER",
                user_name=user_name,
                summary=data.get("summary", "Análise de engajamento dos membros concluída com sucesso."),
                insights=insights,
                generated_at=now
            )
        except Exception as e:
            logger.error(f"Erro na geração de insights para líder via Gemini: {e}")
            fallback_insights = []
            for m in members_data:
                sev = "high_concern" if m["missed_consecutive"] >= 2 else "positive"
                prob = 80.0 if m["missed_consecutive"] >= 3 else (50.0 if m["missed_consecutive"] == 2 else 15.0)
                fallback_insights.append(StrategicInsightItemDTO(
                    target_id=m["id"],
                    target_name=m["name"],
                    category="member_absence",
                    severity=sev,
                    days_inactive=m["missed_consecutive"] * 7,
                    inactivity_rate=prob,
                    title=f"Acompanhamento de {m['name']}",
                    observation=f"Ausente em {m['missed_consecutive']} encontro(s) recente(s).",
                    temporal_analysis=f"Histórico temporal aponta hiato em {m['missed_consecutive']} cultos consecutivos.",
                    probable_causes=["Pressão de estudos e provas", "Dificuldades de deslocamento", "Desmotivação ou isolamento"],
                    action_plan="Envie uma mensagem acolhedora sem cobranças para saber como ele está e oferecer apoio pastoral."
                ))
            return StrategicInsightsResponseDTO(
                role="LEADER",
                user_name=user_name,
                summary="Relatório de discipulado e presença dos adolescentes gerado pelo Copiloto de IA.",
                insights=fallback_insights,
                generated_at=now
            )

    # --------------------------------------------------------------------------
    # 3. VISÃO DO MEMBRO (TEEN)
    # --------------------------------------------------------------------------
    else:
        return StrategicInsightsResponseDTO(
            role="TEEN",
            user_name=user_name,
            summary="Sua jornada na fé está sendo construída a cada encontro!",
            insights=[
                StrategicInsightItemDTO(
                    target_id=user_id,
                    target_name=user_name,
                    category="encouragement",
                    severity="positive",
                    days_inactive=0,
                    inactivity_rate=5.0,
                    title="Constância e Propósito",
                    observation="Você faz parte ativa da nossa comunidade cristã de adolescentes.",
                    temporal_analysis="Acompanhar a agenda e confirmar presença fortalece seus laços ministeriais.",
                    probable_causes=[],
                    action_plan="Consulte a agenda dos próximos cultos e convide um amigo para participar com você!"
                )
            ],
            generated_at=now
        )
