/**
 * ==============================================================================
 * Sermon AI Embeddable Widget v2.0 (Zero Dependencies & Full Features)
 * Permite integrar o Agente de IA para Pregações em QUALQUER website:
 * WordPress, Wix, Webflow, Squarespace, Shopify, Landing Pages ou HTML puro.
 * ==============================================================================
 */
(function () {
  const currentScript = document.currentScript;
  const apiUrl = currentScript?.getAttribute("data-api-url") || "http://localhost:8000";
  const containerId = currentScript?.getAttribute("data-container") || "sermon-ai-widget";

  function initWidget() {
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <style>
        .sai-box {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #090d16;
          color: #f1f5f9;
          border: 1px solid #1e293b;
          border-radius: 20px;
          padding: 24px;
          max-width: 650px;
          margin: 20px auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
          box-sizing: border-box;
        }
        .sai-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .sai-title { font-size: 20px; font-weight: 800; margin: 0; color: #f8fafc; display: flex; align-items: center; gap: 8px; }
        .sai-badge-ai { font-size: 10px; background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); border-radius: 999px; padding: 2px 8px; font-weight: 700; text-transform: uppercase; }
        .sai-desc { font-size: 13px; color: #94a3b8; margin: 0 0 16px 0; line-height: 1.4; }
        .sai-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #020617; padding: 4px; border-radius: 12px; border: 1px solid #1e293b; margin-bottom: 16px; }
        .sai-tab-btn { background: transparent; border: none; color: #94a3b8; padding: 8px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .sai-tab-btn.active { background: #2563eb; color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.4); }
        .sai-dropzone { border: 2px dashed #334155; border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; background: #020617; margin-bottom: 14px; transition: border-color 0.2s; }
        .sai-dropzone:hover { border-color: #3b82f6; }
        .sai-record-panel { background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 14px; display: none; }
        .sai-rec-btn { width: 56px; height: 56px; border-radius: 50%; background: #dc2626; color: #fff; border: none; font-size: 20px; cursor: pointer; box-shadow: 0 0 15px rgba(220,38,38,0.4); transition: transform 0.2s; }
        .sai-rec-btn:hover { transform: scale(1.05); }
        .sai-rec-timer { font-size: 22px; font-family: monospace; font-weight: 700; color: #f87171; margin-top: 10px; }
        .sai-input { width: 100%; box-sizing: border-box; padding: 10px 14px; background: #020617; border: 1px solid #1e293b; border-radius: 10px; color: #fff; font-size: 13px; margin-bottom: 12px; }
        .sai-input:focus { outline: none; border-color: #3b82f6; }
        .sai-submit-btn { width: 100%; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; border: none; padding: 13px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
        .sai-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sai-status { display: none; font-size: 12px; color: #93c5fd; margin-top: 12px; text-align: center; }
        .sai-result-panel { margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b; display: none; }
        .sai-theme-card { background: rgba(37,99,235,0.08); border: 1px solid rgba(59,130,246,0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
        .sai-theme-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #60a5fa; margin-bottom: 4px; }
        .sai-theme-text { font-size: 16px; font-weight: 700; color: #f8fafc; margin: 0; }
        .sai-point-card { background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
        .sai-point-title { font-size: 14px; font-weight: 700; color: #38bdf8; margin: 0 0 6px 0; }
        .sai-point-exp { font-size: 13px; color: #cbd5e1; line-height: 1.5; margin: 0 0 8px 0; }
        .sai-bible-box { background: rgba(245,158,11,0.08); border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 8px 12px; font-size: 12px; color: #fde68a; font-style: italic; margin-bottom: 8px; }
        .sai-actions { display: flex; gap: 8px; margin-top: 16px; }
        .sai-action-btn { flex: 1; background: #1e293b; border: 1px solid #334155; color: #f1f5f9; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; }
        .sai-action-btn:hover { background: #334155; }
      </style>

      <div class="sai-box">
        <div class="sai-header">
          <h3 class="sai-title">🎙️ Pregações AI</h3>
          <span class="sai-badge-ai">Gemini Multimodal</span>
        </div>
        <p class="sai-desc">Gere o esboço homilético completo, versículos e aplicações práticas a partir do áudio ou vídeo da mensagem.</p>

        <!-- Seleção de Modo -->
        <div class="sai-tabs">
          <button type="button" class="sai-tab-btn active" id="sai-tab-upload">📁 Enviar Áudio/Vídeo</button>
          <button type="button" class="sai-tab-btn" id="sai-tab-record">🔴 Gravar ao Vivo</button>
        </div>

        <!-- Modo 1: Upload de Arquivo -->
        <div id="sai-panel-upload">
          <div class="sai-dropzone" id="sai-drop">
            <input type="file" id="sai-file" accept="audio/*,video/*,.mp3,.wav,.ogg,.m4a,.mp4,.mov,.webm" style="display:none;" />
            <div id="sai-file-label" style="font-size:13px; font-weight:500;">
              📂 Clique ou arraste áudio (.mp3, .wav, .m4a) ou vídeo (.mp4, .mov, .webm)
            </div>
          </div>
        </div>

        <!-- Modo 2: Gravação ao Vivo -->
        <div id="sai-panel-record" class="sai-record-panel">
          <button type="button" class="sai-rec-btn" id="sai-rec-btn">🎙️</button>
          <div class="sai-rec-timer" id="sai-rec-timer" style="display:none;">00:00</div>
          <p id="sai-rec-status" style="font-size:12px; color:#94a3b8; margin-top:8px;">Clique no microfone para gravar o culto ao vivo</p>
          <audio id="sai-audio-preview" controls style="width:100%; margin-top:10px; display:none;"></audio>
        </div>

        <!-- Metadados Opcionais -->
        <input type="text" class="sai-input" id="sai-preacher" placeholder="Nome do Pregador (Ex: Pastor Marcos)" />
        <input type="text" class="sai-input" id="sai-title" placeholder="Título da Pregação (Opcional)" />

        <button type="button" class="sai-submit-btn" id="sai-submit" disabled>Gerar Esboço e Insights Teológicos</button>

        <div class="sai-status" id="sai-status">
          ⏳ Transcrevendo e extraindo insights teológicos com Google Gemini...
        </div>

        <!-- Painel de Resultados -->
        <div class="sai-result-panel" id="sai-result">
          <div class="sai-theme-card">
            <div class="sai-theme-label">🎯 Tema Central</div>
            <div class="sai-theme-text" id="sai-res-theme"></div>
          </div>

          <div style="margin-bottom:16px;">
            <strong style="font-size:12px; color:#94a3b8; text-transform:uppercase;">📖 Introdução:</strong>
            <p id="sai-res-intro" style="font-size:13px; color:#cbd5e1; line-height:1.5; margin:4px 0;"></p>
          </div>

          <strong style="font-size:12px; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:8px;">✝️ Pontos Centrais & Bíblia:</strong>
          <div id="sai-res-points"></div>

          <div style="margin-top:16px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:10px; padding:12px;">
            <strong style="font-size:12px; color:#34d399; text-transform:uppercase;">🕊️ Conclusão & Desafio:</strong>
            <p id="sai-res-conclusion" style="font-size:13px; color:#cbd5e1; line-height:1.5; margin:4px 0;"></p>
          </div>

          <div class="sai-actions">
            <button type="button" class="sai-action-btn" id="sai-copy-btn">📋 Copiar Esboço</button>
            <button type="button" class="sai-action-btn" id="sai-download-btn">💾 Baixar (.md)</button>
          </div>
        </div>
      </div>
    `;

    // Elementos DOM
    const tabUpload = document.getElementById("sai-tab-upload");
    const tabRecord = document.getElementById("sai-tab-record");
    const panelUpload = document.getElementById("sai-panel-upload");
    const panelRecord = document.getElementById("sai-panel-record");
    const dropEl = document.getElementById("sai-drop");
    const fileInput = document.getElementById("sai-file");
    const fileLabel = document.getElementById("sai-file-label");
    const recBtn = document.getElementById("sai-rec-btn");
    const recTimer = document.getElementById("sai-rec-timer");
    const recStatus = document.getElementById("sai-rec-status");
    const audioPreview = document.getElementById("sai-audio-preview");
    const submitBtn = document.getElementById("sai-submit");
    const statusEl = document.getElementById("sai-status");
    const resultPanel = document.getElementById("sai-result");
    const copyBtn = document.getElementById("sai-copy-btn");
    const downloadBtn = document.getElementById("sai-download-btn");

    let currentFile = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let timerInterval = null;
    let secondsElapsed = 0;
    let latestData = null;

    // Alternar Abas
    tabUpload.addEventListener("click", () => {
      tabUpload.classList.add("active");
      tabRecord.classList.remove("active");
      panelUpload.style.display = "block";
      panelRecord.style.display = "none";
    });

    tabRecord.addEventListener("click", () => {
      tabRecord.classList.add("active");
      tabUpload.classList.remove("active");
      panelRecord.style.display = "block";
      panelUpload.style.display = "none";
    });

    // Upload de Arquivo
    dropEl.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        currentFile = e.target.files[0];
        fileLabel.innerHTML = `✅ <strong>${currentFile.name}</strong> (${(currentFile.size / 1048576).toFixed(1)}MB)`;
        submitBtn.disabled = false;
      }
    });

    // Gravação de Microfone
    recBtn.addEventListener("click", async () => {
      if (!isRecording) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            currentFile = new File([blob], `gravacao_ao_vivo_${Date.now()}.webm`, { type: "audio/webm" });
            audioPreview.src = URL.createObjectURL(blob);
            audioPreview.style.display = "block";
            submitBtn.disabled = false;
            recStatus.innerText = "✅ Gravação concluída e pronta para envio!";
            stream.getTracks().forEach((t) => t.stop());
          };

          mediaRecorder.start();
          isRecording = true;
          secondsElapsed = 0;
          recBtn.innerText = "⏹️";
          recTimer.style.display = "block";
          recStatus.innerText = "Gravando pregação ao vivo...";

          timerInterval = setInterval(() => {
            secondsElapsed++;
            const m = Math.floor(secondsElapsed / 60).toString().padStart(2, "0");
            const s = (secondsElapsed % 60).toString().padStart(2, "0");
            recTimer.innerText = `${m}:${s}`;
          }, 1000);
        } catch (err) {
          recStatus.innerText = "❌ Permissão de microfone negada no navegador.";
        }
      } else {
        mediaRecorder.stop();
        isRecording = false;
        clearInterval(timerInterval);
        recBtn.innerText = "🎙️";
      }
    });

    // Envio para o Backend
    submitBtn.addEventListener("click", async () => {
      if (!currentFile) return;
      submitBtn.disabled = true;
      statusEl.style.display = "block";
      resultPanel.style.display = "none";

      const formData = new FormData();
      formData.append("file", currentFile);
      const preacher = document.getElementById("sai-preacher").value;
      const title = document.getElementById("sai-title").value;
      if (preacher) formData.append("preacher", preacher);
      if (title) formData.append("title", title);

      try {
        const res = await fetch(`${apiUrl}/api/sermons/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Erro HTTP ${res.status}`);
        }

        const data = await res.json();
        latestData = data;

        statusEl.style.display = "none";
        resultPanel.style.display = "block";

        document.getElementById("sai-res-theme").innerText = data.structured_content.tema;
        document.getElementById("sai-res-intro").innerText = data.structured_content.introducao;
        document.getElementById("sai-res-conclusion").innerText = data.structured_content.conclusao;

        let pointsHtml = "";
        data.structured_content.pontos_principais.forEach((p, i) => {
          pointsHtml += `
            <div class="sai-point-card">
              <div class="sai-point-title">${i + 1}. ${p.titulo}</div>
              <p class="sai-point-exp">${p.explicacao}</p>
              <div class="sai-bible-box">📜 "${p.referencia_biblica}"</div>
              ${p.aplicacao_pratica ? `<div style="font-size:11px; color:#93c5fd;">💡 <strong>Aplicação:</strong> ${p.aplicacao_pratica}</div>` : ""}
            </div>
          `;
        });
        document.getElementById("sai-res-points").innerHTML = pointsHtml;
      } catch (err) {
        statusEl.innerHTML = `<span style="color:#f87171;">❌ ${err.message}</span>`;
        submitBtn.disabled = false;
      }
    });

    // Ações de Cópia e Download
    copyBtn.addEventListener("click", () => {
      if (!latestData) return;
      let text = `# ${latestData.title}\n\n## 🎯 Tema\n${latestData.structured_content.tema}\n\n## 📖 Introdução\n${latestData.structured_content.introducao}\n\n## ✝️ Pontos Principais\n`;
      latestData.structured_content.pontos_principais.forEach((p, i) => {
        text += `\n### ${i + 1}. ${p.titulo}\n${p.explicacao}\n> "${p.referencia_biblica}"\n`;
      });
      text += `\n## 🕊️ Conclusão\n${latestData.structured_content.conclusao}\n`;

      navigator.clipboard.writeText(text);
      copyBtn.innerText = "✅ Copiado!";
      setTimeout(() => (copyBtn.innerText = "📋 Copiar Esboço"), 2000);
    });

    downloadBtn.addEventListener("click", () => {
      if (!latestData) return;
      let text = `# ${latestData.title}\n\n## 🎯 Tema\n${latestData.structured_content.tema}\n\n## 📖 Introdução\n${latestData.structured_content.introducao}\n\n## ✝️ Pontos Principais\n`;
      latestData.structured_content.pontos_principais.forEach((p, i) => {
        text += `\n### ${i + 1}. ${p.titulo}\n${p.explicacao}\n> "${p.referencia_biblica}"\n`;
      });
      text += `\n## 🕊️ Conclusão\n${latestData.structured_content.conclusao}\n`;

      const blob = new Blob([text], { type: "text/markdown;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(latestData.title || "esboco").toLowerCase().replace(/[^a-z0-9]/g, "_")}.md`;
      a.click();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }
})();
