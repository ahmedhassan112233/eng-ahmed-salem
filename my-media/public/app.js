// AI Marketing Mentor & Strategy Hub - Main JavaScript Application

document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    currentTab: 'tab-chat',
    apiKey: localStorage.getItem('gemini_api_key') || '',
    chatHistory: JSON.parse(localStorage.getItem('chat_history') || '[]'),
    strategies: [],
    activeCategory: 'all',
    activeBudget: 'all',
    searchQuery: '',
    chatAttachment: null,
    analyzerImage: null
  };

  // Initialize App
  initNavigation();
  initSettingsModal();
  initChatTab();
  initStrategyLibrary();
  initAnalyzerTab();
  initRecommenderTab();

  // ----------------------------------------------------
  // 1. NAVIGATION & TABS
  // ----------------------------------------------------
  function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        state.currentTab = targetTab;

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        contents.forEach(c => {
          if (c.id === targetTab) {
            c.classList.remove('hidden');
          } else {
            c.classList.add('hidden');
          }
        });
      });
    });
  }

  // ----------------------------------------------------
  // 2. SETTINGS MODAL (API KEY)
  // ----------------------------------------------------
  function initSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const btnOpen = document.getElementById('btn-settings');
    const btnClose = document.getElementById('btn-close-settings');
    const btnSave = document.getElementById('btn-save-key');
    const btnReset = document.getElementById('btn-reset-key');
    const keyInput = document.getElementById('api-key-input');

    if (state.apiKey) keyInput.value = state.apiKey;

    btnOpen.addEventListener('click', () => modal.classList.remove('hidden'));
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));

    btnSave.addEventListener('click', () => {
      state.apiKey = keyInput.value.trim();
      localStorage.setItem('gemini_api_key', state.apiKey);
      modal.classList.add('hidden');
      alert('تم حفظ مفتاح API بنجاح!');
    });

    btnReset.addEventListener('click', () => {
      state.apiKey = '';
      keyInput.value = '';
      localStorage.removeItem('gemini_api_key');
      modal.classList.add('hidden');
      alert('تم إعادة استخدام المفتاح الافتراضي.');
    });
  }

  // ----------------------------------------------------
  // 3. TAB 1: AI MENTOR CHAT
  // ----------------------------------------------------
  function initChatTab() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const fileInput = document.getElementById('chat-file-input');
    const btnClear = document.getElementById('btn-clear-chat');
    const attachmentPreview = document.getElementById('chat-attachment-preview');
    const attachmentName = document.getElementById('chat-attachment-name');
    const btnRemoveAttachment = document.getElementById('chat-remove-attachment');
    const quickPromptBtns = document.querySelectorAll('.quick-prompt-btn');

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    // Quick Prompts
    quickPromptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        chatInput.value = btn.innerText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
        chatForm.dispatchEvent(new Event('submit'));
      });
    });

    // Handle File Attachment
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          state.chatAttachment = {
            name: file.name,
            mimeType: file.type,
            base64: event.target.result.split(',')[1]
          };
          attachmentName.innerText = file.name;
          attachmentPreview.classList.remove('hidden');
          attachmentPreview.classList.add('flex');
        };
        reader.readAsDataURL(file);
      }
    });

    btnRemoveAttachment.addEventListener('click', () => {
      state.chatAttachment = null;
      fileInput.value = '';
      attachmentPreview.classList.add('hidden');
      attachmentPreview.classList.remove('flex');
    });

    // Clear Chat History
    btnClear.addEventListener('click', () => {
      if (confirm('هل أنت تأكد من مسح سجل المحادثة؟')) {
        state.chatHistory = [];
        localStorage.removeItem('chat_history');
        chatContainer.innerHTML = `
          <div class="flex items-start gap-3.5 max-w-3xl">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm shrink-0 shadow-md">
              <i class="fa-solid fa-robot"></i>
            </div>
            <div class="glass-card rounded-2xl rounded-tr-none p-4 text-slate-200 border border-slate-700/60 shadow-sm">
              <div class="chat-message-content space-y-2 text-sm md:text-base">
                <p class="font-bold text-indigo-400 flex items-center gap-2">
                  <span>أهلاً بك! أنا مستشارك التسويقي الذكي 🚀</span>
                </p>
                <p>أنا هنا لمساعدتك في تحليل نتائج الإعلانات، تشخيص المشاكل، وتطوير استراتيجيات الاستهداف والمحتوى الإعلاني.</p>
              </div>
              <span class="text-[10px] text-slate-500 mt-2 block">الآن</span>
            </div>
          </div>`;
      }
    });

    // Form Submit
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text && !state.chatAttachment) return;

      // Render User Message
      renderChatMessage('user', text, state.chatAttachment);

      const userPayload = {
        message: text,
        image: state.chatAttachment,
        history: state.chatHistory,
        apiKey: state.apiKey
      };

      // Push to state history
      state.chatHistory.push({ role: 'user', content: text });

      // Reset Inputs
      chatInput.value = '';
      chatInput.style.height = 'auto';
      state.chatAttachment = null;
      fileInput.value = '';
      attachmentPreview.classList.add('hidden');
      attachmentPreview.classList.remove('flex');

      // Loading Indicator
      const loadingEl = renderLoadingBubble();
      chatContainer.scrollTop = chatContainer.scrollHeight;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userPayload)
        });

        const data = await response.json();
        chatContainer.removeChild(loadingEl);

        if (data.reply) {
          renderChatMessage('assistant', data.reply);
          state.chatHistory.push({ role: 'assistant', content: data.reply });
          localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
        } else {
          renderChatMessage('assistant', '⚠️ حدث خطأ أثناء الاتصال بالخادم. حاول مرة أخرى.');
        }
      } catch (err) {
        chatContainer.removeChild(loadingEl);
        renderChatMessage('assistant', '⚠️ تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الخادم والاتصال بالشبكة.');
      }

      chatContainer.scrollTop = chatContainer.scrollHeight;
    });

    function renderChatMessage(sender, text, attachment = null) {
      const msgDiv = document.createElement('div');
      const isUser = sender === 'user';
      msgDiv.className = `flex items-start gap-3.5 max-w-3xl ${isUser ? 'mr-auto flex-row-reverse' : ''}`;

      const avatar = isUser ? `
        <div class="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-slate-200 text-sm shrink-0 shadow-md">
          <i class="fa-solid fa-user"></i>
        </div>` : `
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm shrink-0 shadow-md">
          <i class="fa-solid fa-robot"></i>
        </div>`;

      const attachmentHtml = attachment ? `
        <div class="mb-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700 flex items-center gap-2 text-xs text-indigo-300">
          <i class="fa-solid fa-image"></i>
          <span>${attachment.name}</span>
        </div>` : '';

      msgDiv.innerHTML = `
        ${avatar}
        <div class="glass-card rounded-2xl ${isUser ? 'rounded-tl-none bg-indigo-950/40 border-indigo-800/40' : 'rounded-tr-none border-slate-700/60'} p-4 text-slate-200 shadow-sm">
          ${attachmentHtml}
          <div class="chat-message-content text-sm md:text-base">
            ${formatMarkdown(text)}
          </div>
          <span class="text-[10px] text-slate-500 mt-2 block ${isUser ? 'text-left' : ''}">${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>`;

      chatContainer.appendChild(msgDiv);
    }

    function renderLoadingBubble() {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'flex items-start gap-3.5 max-w-3xl';
      loadingDiv.innerHTML = `
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm shrink-0 shadow-md">
          <i class="fa-solid fa-robot animate-spin"></i>
        </div>
        <div class="glass-card rounded-2xl rounded-tr-none p-4 text-slate-400 text-sm border border-slate-700/60 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
          <span>جاري التفكير وتحليل الإجابة...</span>
        </div>`;
      chatContainer.appendChild(loadingDiv);
      return loadingDiv;
    }
  }

  // ----------------------------------------------------
  // 4. TAB 2: STRATEGY LIBRARY
  // ----------------------------------------------------
  async function initStrategyLibrary() {
    const grid = document.getElementById('strategies-grid');
    const searchInput = document.getElementById('strategy-search');
    const catBtns = document.querySelectorAll('.cat-filter-btn');
    const budgetBtns = document.querySelectorAll('.budget-filter-btn');
    const modal = document.getElementById('strategy-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalContent = document.getElementById('modal-content-area');

    btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));

    // Fetch Strategies Data
    try {
      const res = await fetch('/api/strategies');
      state.strategies = await res.json();
      renderStrategiesGrid();
    } catch (err) {
      grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-10">فشل في تحميل قائمة الاستراتيجيات. يرجى التأكد من تشغيل الخادم.</div>`;
    }

    // Category Filter Click
    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => {
          b.classList.remove('bg-indigo-600', 'text-white');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        btn.classList.remove('bg-slate-800', 'text-slate-300');
        btn.classList.add('bg-indigo-600', 'text-white');

        state.activeCategory = btn.getAttribute('data-cat');
        renderStrategiesGrid();
      });
    });

    // Budget Filter Click
    budgetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        budgetBtns.forEach(b => {
          b.classList.remove('bg-indigo-600/30', 'border-indigo-500/50', 'text-indigo-300');
          b.classList.add('bg-slate-800', 'text-slate-400');
        });
        btn.classList.remove('bg-slate-800', 'text-slate-400');
        btn.classList.add('bg-indigo-600/30', 'border-indigo-500/50', 'text-indigo-300');

        state.activeBudget = btn.getAttribute('data-budget');
        renderStrategiesGrid();
      });
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderStrategiesGrid();
    });

    function renderStrategiesGrid() {
      const filtered = state.strategies.filter(item => {
        const matchCategory = state.activeCategory === 'all' || item.category === state.activeCategory;
        const matchBudget = state.activeBudget === 'all' || item.budgetTier === state.activeBudget;
        const matchQuery = !state.searchQuery || 
          item.title.toLowerCase().includes(state.searchQuery) || 
          item.description.toLowerCase().includes(state.searchQuery) ||
          item.tags.some(t => t.toLowerCase().includes(state.searchQuery));

        return matchCategory && matchBudget && matchQuery;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full text-center py-16 text-slate-500 space-y-2">
            <i class="fa-solid fa-folder-open text-4xl text-slate-700"></i>
            <p>لم يتم العثور على استراتيجيات تطابق خيارات البحث الحالية.</p>
          </div>`;
        return;
      }

      grid.innerHTML = filtered.map(strat => `
        <div class="glass-card rounded-2xl p-5 flex flex-col justify-between border border-slate-800 hover:border-indigo-500/50 transition group">
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">${strat.category}</span>
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">${strat.platform}</span>
            </div>

            <h3 class="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition line-clamp-1">${strat.title}</h3>
            <p class="text-xs text-slate-400 leading-relaxed line-clamp-3">${strat.description}</p>
          </div>

          <div class="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span class="text-xs text-amber-400 font-medium flex items-center gap-1">
              <i class="fa-solid fa-coins"></i> ${strat.budgetLabel}
            </span>
            <button data-id="${strat.id}" class="btn-view-strat px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5">
              <span>عرض الإستراتيجية</span>
              <i class="fa-solid fa-arrow-left text-[10px]"></i>
            </button>
          </div>
        </div>
      `).join('');

      // Add Click Listeners to Modal View
      document.querySelectorAll('.btn-view-strat').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const strat = state.strategies.find(s => s.id === id);
          if (strat) openStrategyModal(strat);
        });
      });
    }

    function openStrategyModal(strat) {
      modalContent.innerHTML = `
        <div class="space-y-6">
          <div class="space-y-2 border-b border-slate-800 pb-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">${strat.category}</span>
              <span class="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">${strat.platform}</span>
              <span class="text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">${strat.budgetLabel}</span>
            </div>
            <h2 class="text-xl md:text-2xl font-bold text-slate-100">${strat.title}</h2>
            <p class="text-sm text-slate-300 leading-relaxed">${strat.description}</p>
          </div>

          <!-- Step by Step Plan -->
          <div class="space-y-3">
            <h3 class="text-base font-bold text-indigo-400 flex items-center gap-2">
              <i class="fa-solid fa-list-check"></i>
              <span>خطوات التنفيذ المنهجية (Step-by-Step):</span>
            </h3>
            <div class="space-y-2.5">
              ${strat.steps.map((step, idx) => `
                <div class="glass-card p-3.5 rounded-xl border border-slate-800 flex items-start gap-3">
                  <span class="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span>
                  <div class="text-sm text-slate-200 leading-relaxed">${step}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- KPIs -->
          <div class="space-y-2">
            <h3 class="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <i class="fa-solid fa-chart-line"></i>
              <span>مؤشرات الأداء الرئيسية (KPIs للتتبع):</span>
            </h3>
            <div class="flex flex-wrap gap-2">
              ${strat.kpis.map(kpi => `
                <span class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">${kpi}</span>
              `).join('')}
            </div>
          </div>

          <!-- Pro Tips & Warnings -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1.5 text-xs md:text-sm">
              <p class="font-bold flex items-center gap-1.5 text-amber-400">
                <i class="fa-solid fa-lightbulb"></i> نصيحة الخبراء (Pro-Tip):
              </p>
              <p class="leading-relaxed">${strat.proTip}</p>
            </div>

            <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 space-y-1.5 text-xs md:text-sm">
              <p class="font-bold flex items-center gap-1.5 text-red-400">
                <i class="fa-solid fa-triangle-exclamation"></i> أخطاء يجب تجنبها:
              </p>
              <p class="leading-relaxed">${strat.avoidMistakes}</p>
            </div>
          </div>
        </div>`;

      modal.classList.remove('hidden');
    }
  }

  // ----------------------------------------------------
  // 5. TAB 3: AD & SCREENSHOT ANALYZER
  // ----------------------------------------------------
  function initAnalyzerTab() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('analyzer-file-input');
    const previewBox = document.getElementById('analyzer-preview-box');
    const previewImg = document.getElementById('analyzer-preview-img');
    const btnRemove = document.getElementById('btn-remove-analyzer-img');
    const btnRun = document.getElementById('btn-run-analysis');
    const outputArea = document.getElementById('analysis-output');
    const statusTag = document.getElementById('analysis-status-tag');
    const actionsArea = document.getElementById('analyzer-actions');
    const btnCopy = document.getElementById('btn-copy-analysis');
    const notesInput = document.getElementById('analyzer-notes');
    const typeSelect = document.getElementById('analysis-type');

    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dropzone-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dropzone-active');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
      if (!file.type.startsWith('image/')) {
        alert('يرجى رفع ملف صورة فقط (PNG, JPG, WEBP)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        state.analyzerImage = {
          name: file.name,
          mimeType: file.type,
          base64: event.target.result.split(',')[1]
        };

        previewImg.src = event.target.result;
        dropzone.classList.add('hidden');
        previewBox.classList.remove('hidden');
        statusTag.innerText = 'الصورة جاهزة للتحليل';
        statusTag.className = 'text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      };
      reader.readAsDataURL(file);
    }

    btnRemove.addEventListener('click', () => {
      state.analyzerImage = null;
      fileInput.value = '';
      previewBox.classList.add('hidden');
      dropzone.classList.remove('hidden');
      statusTag.innerText = 'بانتظار الصورة...';
      statusTag.className = 'text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700';
    });

    btnRun.addEventListener('click', async () => {
      if (!state.analyzerImage) {
        alert('يرجى رفع صورة أولاً لتقييمها وتحليلها.');
        return;
      }

      outputArea.innerHTML = `
        <div class="flex items-center justify-center py-20 text-indigo-400 flex-col gap-3">
          <i class="fa-solid fa-spinner animate-spin text-4xl"></i>
          <p class="text-sm font-semibold animate-pulse">جاري فحص الصورة وتحليل الأرقام والتصميم بواسطة الذكاء الاصطناعي...</p>
        </div>`;

      statusTag.innerText = 'جاري التحليل...';
      statusTag.className = 'text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse';

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: state.analyzerImage,
            analysisType: typeSelect.value,
            notes: notesInput.value.trim(),
            apiKey: state.apiKey
          })
        });

        const data = await response.json();

        if (data.analysis) {
          outputArea.innerHTML = formatMarkdown(data.analysis);
          statusTag.innerText = 'اكتمل التحليل ✅';
          statusTag.className = 'text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
          actionsArea.classList.remove('hidden');
        } else {
          outputArea.innerHTML = `<div class="text-red-400 p-4">فشل في الحصول على التحليل. يرجى المحاولة مرة أخرى.</div>`;
          statusTag.innerText = 'حدث خطأ';
        }
      } catch (err) {
        outputArea.innerHTML = `<div class="text-red-400 p-4">تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الخادم.</div>`;
        statusTag.innerText = 'خطأ اتصال';
      }
    });

    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(outputArea.innerText);
      alert('تم نسخ التقرير الحلي إلى الحافظة!');
    });
  }

  // ----------------------------------------------------
  // 6. TAB 4: STRATEGY RECOMMENDER
  // ----------------------------------------------------
  function initRecommenderTab() {
    const form = document.getElementById('recommender-form');
    const outputCard = document.getElementById('rec-output-card');
    const outputContent = document.getElementById('rec-output-content');
    const btnCopy = document.getElementById('btn-copy-rec');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        businessType: document.getElementById('rec-business-type').value,
        goal: document.getElementById('rec-goal').value,
        budget: document.getElementById('rec-budget').value,
        platform: document.getElementById('rec-platform').value,
        notes: document.getElementById('rec-notes').value.trim(),
        apiKey: state.apiKey
      };

      outputCard.classList.remove('hidden');
      outputContent.innerHTML = `
        <div class="flex items-center justify-center py-16 text-amber-400 flex-col gap-3">
          <i class="fa-solid fa-brain animate-bounce text-4xl"></i>
          <p class="text-sm font-semibold animate-pulse">جاري تحليل بيانات مشروعك وبناء الخطة الإستراتيجية المخصصة...</p>
        </div>`;

      try {
        const response = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.recommendation) {
          outputContent.innerHTML = formatMarkdown(data.recommendation);
        } else {
          outputContent.innerHTML = `<div class="text-red-400">تعذر إنشاء التوصية. يرجى إعادة المحاولة.</div>`;
        }
      } catch (err) {
        outputContent.innerHTML = `<div class="text-red-400">تعذر الاتصال بالخادم.</div>`;
      }
    });

    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(outputContent.innerText);
      alert('تم نسخ الخطة الإستراتيجية بنجاح!');
    });
  }

  // Helper Markdown Formatter
  function formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-indigo-400 mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-purple-400 mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-slate-100 mt-4 mb-2">$1</h1>')
      .replace(/^\* (.*$)/gim, '<li class="mr-4">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="mr-4">$1</li>')
      .replace(/\n\n/g, '<br/><br/>');

    return html;
  }
});