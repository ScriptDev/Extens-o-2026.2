import {
  SermonOutline,
  SermonListItem,
  EventItem,
  CreateEventInput,
  EventInviteResponse,
  EventAIAssistRequest,
  EventAIAssistResponse,
  UserItem,
  AttendanceItem,
  EventAttendanceStats,
  NotificationItem,
  MinistryItem,
  MinistryAISuggestion,
  ApiError,
} from "@/types/sermon";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiClientError extends Error {
  statusCode: number;
  errorType: string;

  constructor(message: string, statusCode: number, errorType: string = "ApiError") {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

/**
 * [Serviço de API] Envia o arquivo de áudio ou vídeo para o backend FastAPI,
 * opcionalmente associando-o a um Evento da Agenda (eventId).
 */
export async function uploadSermonAudio(
  file: File,
  preacher?: string,
  title?: string,
  eventId?: string
): Promise<SermonOutline> {
  const formData = new FormData();
  formData.append("file", file);

  if (eventId && eventId.trim()) {
    formData.append("event_id", eventId.trim());
  }

  if (preacher && preacher.trim()) {
    formData.append("preacher", preacher.trim());
  }

  if (title && title.trim()) {
    formData.append("title", title.trim());
  }

  const response = await fetch(`${API_BASE_URL}/api/sermons/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Erro ao processar a pregação.";
    let errorType = "HttpError";

    try {
      const errJson: ApiError = await response.json();
      errorDetail = errJson.message || errorDetail;
      errorType = errJson.error || errorType;
    } catch {
      errorDetail = `Servidor retornou erro com status ${response.status}.`;
    }

    throw new ApiClientError(errorDetail, response.status, errorType);
  }

  return response.json();
}

/**
 * [Serviço de API] Recupera um esboço persistido pelo seu UUID.
 */
export async function getSermonById(id: string): Promise<SermonOutline> {
  const response = await fetch(`${API_BASE_URL}/api/sermons/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorDetail = "Esboço não encontrado.";
    let errorType = "NotFoundError";

    try {
      const errJson: ApiError = await response.json();
      errorDetail = errJson.message || errorDetail;
      errorType = errJson.error || errorType;
    } catch {
      errorDetail = `Erro ao carregar esboço (Status ${response.status}).`;
    }

    throw new ApiClientError(errorDetail, response.status, errorType);
  }

  return response.json();
}

/**
 * [Serviço de API] Lista os esboços criados.
 */
export async function listSermons(): Promise<SermonListItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sermons`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

// ==============================================================================
// Serviços da Agenda Inteligente de Cultos
// ==============================================================================

/**
 * [Agenda] Lista todos os cultos e eventos cadastrados com controle de RBAC e Tags.
 */
export async function listEvents(token?: string, tag?: string): Promise<EventItem[]> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = tag ? `${API_BASE_URL}/api/events?tag=${encodeURIComponent(tag)}` : `${API_BASE_URL}/api/events`;
    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

/**
 * [Agenda] Recupera os dados de um evento e o sermão associado pela IA.
 */
export async function getEventById(id: string): Promise<EventItem> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiClientError("Evento não encontrado.", response.status, "NotFoundError");
  }

  return response.json();
}

/**
 * [Agenda] Cria um novo evento no calendário.
 */
export async function createEvent(data: CreateEventInput, token?: string): Promise<EventItem> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorDetail = "Erro ao cadastrar evento.";
    try {
      const errJson: ApiError = await response.json();
      errorDetail = errJson.message || errorDetail;
    } catch {}
    throw new ApiClientError(errorDetail, response.status);
  }

  return response.json();
}

/**
 * [Bônus IA] Gera um convite atrativo para WhatsApp com a IA do Gemini.
 */
export async function generateEventInvite(eventId: string): Promise<EventInviteResponse> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new ApiClientError("Não foi possível gerar o convite com a IA.", response.status);
  }

  return response.json();
}

/**
 * [Busca por CEP] Consulta o endereço completo e gera Google Maps a partir do CEP.
 */
export async function lookupCep(cep: string): Promise<any> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) {
    throw new ApiClientError("CEP inválido. Deve conter 8 dígitos.", 400);
  }

  const response = await fetch(`${API_BASE_URL}/api/events/cep/${cleanCep}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new ApiClientError("CEP não encontrado ou indisponível.", response.status);
  }

  return response.json();
}

/**
 * [Copiloto IA de Eventos] Analisa briefing de texto, detecta inconsistências, sugere mapas, liturgia e banners.
 */
export async function assistEventWithAI(payload: EventAIAssistRequest): Promise<EventAIAssistResponse> {
  const response = await fetch(`${API_BASE_URL}/api/events/ai-assist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = "Não foi possível analisar o evento com a IA.";
    try {
      const errJson: ApiError = await response.json();
      errorDetail = errJson.message || errorDetail;
    } catch {}
    throw new ApiClientError(errorDetail, response.status);
  }

  return response.json();
}

/**
 * [Copiloto IA de Eventos] Analisa gravação de voz / áudio com as instruções do culto.
 */
export async function assistEventWithAIAudio(audioBlob: Blob): Promise<EventAIAssistResponse> {
  const formData = new FormData();
  formData.append("file", audioBlob, "agenda_briefing.wav");

  const response = await fetch(`${API_BASE_URL}/api/events/ai-assist-audio`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Não foi possível processar o áudio com a IA.";
    try {
      const errJson: ApiError = await response.json();
      errorDetail = errJson.message || errorDetail;
    } catch {}
    throw new ApiClientError(errorDetail, response.status);
  }

  return response.json();
}

/**
 * [Agenda Teens] Confirma presença no evento (RF09)
 */
export async function confirmEventAttendance(eventId: string, token?: string): Promise<AttendanceItem> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/attendance`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    let errDetail = "Erro ao confirmar presença.";
    try {
      const errJson = await response.json();
      errDetail = errJson.detail || errDetail;
    } catch {}
    throw new ApiClientError(errDetail, response.status);
  }

  return response.json();
}

/**
 * [Agenda Teens] Cancela presença no evento (RF10)
 */
export async function cancelEventAttendance(eventId: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/attendance`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw new ApiClientError("Erro ao cancelar presença.", response.status);
  }

  return response.json();
}

/**
 * [Agenda Teens] Consulta estatísticas e lista de participantes do evento (RF11)
 */
export async function getEventAttendanceStats(eventId: string): Promise<EventAttendanceStats> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/attendance`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      event_id: eventId,
      total_confirmed: 0,
      attendees: [],
      is_full: false,
    };
  }

  return response.json();
}

/**
 * [Agenda Teens] Verifica se o usuário atual está confirmado no evento
 */
export async function checkMyAttendance(eventId: string, token?: string): Promise<boolean> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/attendance/me`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.confirmed);
  } catch {
    return false;
  }
}

/**
 * [Agenda Teens] Cadastra adolescente pelo líder (RF02)
 */
export async function registerTeen(data: any, token?: string): Promise<UserItem> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errDetail = "Erro ao cadastrar adolescente.";
    try {
      const errJson = await response.json();
      errDetail = errJson.detail || errDetail;
    } catch {}
    throw new ApiClientError(errDetail, response.status);
  }

  return response.json();
}

/**
 * [Autenticação Real] Login com e-mail e senha no Supabase
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: UserItem }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let err = "E-mail ou senha incorretos.";
    try {
      const j = await response.json();
      err = j.detail || err;
    } catch {}
    throw new ApiClientError(err, response.status);
  }

  return response.json();
}

/**
 * [Agenda Teens] Lista usuários e adolescentes cadastrados
 */
export async function listTeensUsers(role?: string): Promise<UserItem[]> {
  const url = role ? `${API_BASE_URL}/api/users?role=${role}` : `${API_BASE_URL}/api/users`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) return [];
  return response.json();
}

export const getUsers = listTeensUsers;

/**
 * [Ministérios & Brasões] Lista todos os ministérios oficiais com seus Kanji e SVGs
 */
export async function listMinistries(): Promise<MinistryItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/ministries`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) return [];
  return response.json();
}

/**
 * [Ministérios & Brasões] Cadastra um novo ministério oficial (Exclusivo Pastor/Admin)
 */
export async function createMinistry(
  payload: {
    name: string;
    description?: string;
    kanji_symbol: string;
    kanji_meaning: string;
    badge_svg: string;
    primary_color?: string;
  },
  token?: string
): Promise<MinistryItem> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ministries`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let err = "Erro ao criar ministério.";
    try {
      const j = await response.json();
      err = j.detail || err;
    } catch {}
    throw new ApiClientError(err, response.status);
  }

  return response.json();
}

/**
 * [Ministérios & Brasões] Exclui ministério da lista oficial (Exclusivo Pastor/Admin)
 */
export async function deleteMinistry(id: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ministries/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw new ApiClientError("Erro ao excluir ministério.", response.status);
  }

  return response.json();
}

/**
 * [Ministérios & Brasões] Gera propostas de ministérios com IA Gemini e Ideogramas em Kanji
 */
export async function aiSuggestMinistries(
  themeHint?: string,
  token?: string
): Promise<MinistryAISuggestion[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ministries/ai-suggest`, {
    method: "POST",
    headers,
    body: JSON.stringify({ theme_hint: themeHint }),
  });

  if (!response.ok) {
    throw new ApiClientError("Não foi possível gerar propostas de ministério com IA.", response.status);
  }

  return response.json();
}

/**
 * [Aprovação Pastoral] Homologa e publica um evento no calendário (Exclusivo Pastor/Admin)
 */
export async function approveEvent(eventId: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/approve`, {
    method: "PATCH",
    headers,
  });

  if (!response.ok) {
    let err = "Erro ao aprovar evento.";
    try {
      const j = await response.json();
      err = j.detail || err;
    } catch {}
    throw new ApiClientError(err, response.status);
  }

  return response.json();
}

/**
 * [Aprovação Pastoral] Devolve evento para ajustes (Exclusivo Pastor/Admin)
 */
export async function rejectEvent(eventId: string, reason?: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = reason
    ? `${API_BASE_URL}/api/events/${eventId}/reject?reason=${encodeURIComponent(reason)}`
    : `${API_BASE_URL}/api/events/${eventId}/reject`;

  const response = await fetch(url, {
    method: "PATCH",
    headers,
  });

  if (!response.ok) {
    throw new ApiClientError("Erro ao rejeitar evento.", response.status);
  }

  return response.json();
}

/**
 * [Governança Pastoral] Elege líderes e vincula ministérios (Máximo 3 ministérios)
 */
export async function updateUserRoleAndMinistries(
  userId: string,
  payload: {
    role: "ADMIN" | "PASTOR" | "LEADER" | "TEEN";
    ministries: { id: string; name: string }[];
    tags: string[];
  },
  token?: string
): Promise<UserItem> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let err = "Erro ao atualizar atribuição de liderança.";
    try {
      const j = await response.json();
      err = j.detail || err;
    } catch {}
    throw new ApiClientError(err, response.status);
  }

  return response.json();
}

/**
 * [Homologação Bilateral] Pastor propõe alterações de data, horário ou local
 */
export async function proposeEventChanges(
  eventId: string,
  payload: { proposed_date?: string; proposed_location?: string; pastor_notes: string },
  token?: string
): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/propose-changes`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let err = "Erro ao propor alterações no evento.";
    try {
      const j = await response.json();
      err = j.detail || err;
    } catch {}
    throw new ApiClientError(err, response.status);
  }

  return response.json();
}

/**
 * [Homologação Bilateral] Líder aceita a proposta do Pastor e homologa o evento
 */
export async function acceptEventChanges(eventId: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/accept-changes`, {
    method: "PATCH",
    headers,
  });

  if (!response.ok) {
    let err = "Erro ao aceitar propostas do evento.";
    try {
      const j = await response.json();
      err = j.detail || err;
    } catch {}
    throw new ApiClientError(err, response.status);
  }

  return response.json();
}

/**
 * [Terminologia Nominal da Igreja] Recupera termos e tags configurados
 */
export async function getChurchTerminology(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/settings/terminology`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    return {
      church_name: "Comunidade Teens",
      group_singular: "Ministério",
      group_plural: "Ministérios",
      available_tags: ["#Teatro", "#Louvor", "#Intercessão", "#Mídia", "#Acolhimento", "#Dança", "#Geral"],
      tag_suggestions: [],
    };
  }

  return response.json();
}

/**
 * [Terminologia Nominal da Igreja] Atualiza termos e tags (Exclusivo Pastor/Admin)
 */
export async function updateChurchTerminology(
  payload: { church_name?: string; group_singular?: string; group_plural?: string; available_tags?: string[] },
  token?: string
): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/settings/terminology`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let err = "Erro ao atualizar terminologia.";
    try {
      const j = await response.json();
      err = j.detail || err;
    } catch {}
    throw new ApiClientError(err, response.status);
  }

  return response.json();
}

/**
 * [Sugestão de Tags] Líder sugere nova tag para aprovação pastoral
 */
export async function suggestTag(tag: string, justification?: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/settings/terminology/suggest-tag`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tag, justification }),
  });

  if (!response.ok) {
    throw new ApiClientError("Erro ao sugerir tag.", response.status);
  }

  return response.json();
}

/**
 * [Aprovação de Tag] Pastor aprova tag sugerida (Exclusivo Pastor/Admin)
 */
export async function approveTagSuggestion(suggestionId: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/settings/terminology/approve-tag/${suggestionId}`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    throw new ApiClientError("Erro ao aprovar tag sugerida.", response.status);
  }

  return response.json();
}

/**
 * [IA Estratégica & Temporal] Recupera insights e auditoria de acordo com papel RBAC
 */
export async function getStrategicInsights(token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ai/strategic-insights`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new ApiClientError("Erro ao processar auditoria de IA.", response.status);
  }

  return response.json();
}

/**
 * [Notificações & Recados do Líder] Lista notificações do usuário atual
 */
export async function listNotifications(token?: string): Promise<NotificationItem[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/notifications`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

/**
 * [Notificações] Marca uma notificação como lida
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
      method: "PATCH",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * [Líderes & Pastores] Dispara comunicado para os adolescentes
 */
export async function sendAnnouncement(
  title: string,
  message: string,
  token?: string,
  targetRole: string = "TEEN"
): Promise<{ message: string; title: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/notifications/announcements`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title, message, target_role: targetRole }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new ApiClientError(errData.detail || "Erro ao enviar comunicado.", response.status);
  }

  return response.json();
}

