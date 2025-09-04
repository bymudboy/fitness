// /_javascript/script.js

document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = 'http://localhost:3000';
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    let currentPage = 1;
    // ALTERAÇÃO AQUI: Deixamos o filtro inicial vazio para carregar todas as atividades.
    let currentFilter = '';

    // Elementos do DOM
    const activityListContainer = document.getElementById('activity-list');
    const filterTabs = document.querySelectorAll('.tabs .tab-button');
    const loginLogoutButton = document.getElementById('login-logout-button');
    const loginModal = document.getElementById('login-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const cancelButton = document.getElementById('cancel-button');
    const loginForm = document.getElementById('login-form');
    const btnAtividade = document.getElementById('btn-atividade');

    // Elementos do Perfil e Stats
    const profileImg = document.getElementById('profile-img');
    const profileName = document.getElementById('profile-name');
    const statsAtividades = document.getElementById('stats-atividades');
    const statsCalorias = document.getElementById('stats-calorias');

    // Seções principais
    const feedSection = document.getElementById('feed-section');
    const createActivitySection = document.getElementById('create-activity-section');
    const createActivityForm = document.getElementById('create-activity-form');

    // --- FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE ---

    const updateUIForLogin = () => {
        if (currentUser) {
            loginLogoutButton.textContent = 'Logout';
            btnAtividade.disabled = false;
            btnAtividade.classList.add('enabled');
            profileImg.src = `_imagens/${currentUser.foto_perfil}`;
            profileName.textContent = currentUser.nome_usuario;
            fetchUserStats(currentUser.id_usuario);
        } else {
            loginLogoutButton.textContent = 'Login';
            btnAtividade.disabled = true;
            btnAtividade.classList.remove('enabled', 'active');
            profileImg.src = '_imagens/saepsaude.png';
            profileName.textContent = 'SAEPSaúde';
            fetchGeneralStats();
        }
    };

    const renderActivities = (activities) => {
        activityListContainer.innerHTML = '';
        if (activities.length === 0) {
            activityListContainer.innerHTML = '<p>Nenhuma atividade encontrada para este filtro.</p>';
            return;
        }
        activities.forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            
            const date = new Date(activity.data_atividade);
            const formattedDate = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;

            activityElement.innerHTML = `
                <div class="activity-header">
                    <h4>${activity.tipo}</h4>
                    <span>${formattedDate}</span>
                </div>
                <div class="activity-content">
                    <div class="avatar">
                        <img src="_imagens/${activity.foto_perfil}" alt="Avatar do usuário">
                        <p class="user-name">${activity.nome_usuario}</p>
                    </div>
                    <div class="activity-details">
                        <div>
                            <div class="stat-value">${activity.distancia_km.toFixed(1)} km</div>
                            <div class="stat-label">Distância</div>
                        </div>
                        <div>
                            <div class="stat-value">${activity.duracao_min} min</div>
                            <div class="stat-label">Duração</div>
                        </div>
                        <div>
                            <div class="stat-value">${activity.calorias}</div>
                            <div class="stat-label">Calorias</div>
                        </div>
                    </div>
                    <div class="activity-social">
                        <button class="like-btn" data-id="${activity.id_atividade}"><i class="far fa-heart"></i> ${activity.likes}</button>
                        <button class="comment-btn" data-id="${activity.id_atividade}"><i class="far fa-comment"></i> ${activity.comentarios}</button>
                    </div>
                </div>
            `;
            activityListContainer.appendChild(activityElement);
        });
    };

    // --- FUNÇÕES DE COMUNICAÇÃO COM A API ---

    const fetchAndRenderActivities = async (page = 1, filter = '') => {
        try {
            const response = await fetch(`${apiUrl}/atividades?page=${page}&tipo=${filter}`);
            if (!response.ok) throw new Error('Falha ao buscar atividades');
            const activities = await response.json();
            renderActivities(activities);
        } catch (error) {
            console.error('Erro ao buscar atividades:', error);
            activityListContainer.innerHTML = '<p>Erro ao carregar atividades. Verifique o console.</p>';
        }
    };

    const fetchGeneralStats = async () => {
        try {
            const response = await fetch(`${apiUrl}/stats`);
            const data = await response.json();
            statsAtividades.textContent = data.qtd_atividades || 0;
            statsCalorias.textContent = data.qtd_calorias || 0;
        } catch (error) {
            console.error('Erro ao buscar estatísticas gerais:', error);
        }
    };

    const fetchUserStats = async (userId) => {
        try {
            const response = await fetch(`${apiUrl}/usuarios/${userId}/stats`);
            const data = await response.json();
            statsAtividades.textContent = data.qtd_atividades || 0;
            statsCalorias.textContent = data.qtd_calorias || 0;
        } catch (error) {
            console.error('Erro ao buscar estatísticas do usuário:', error);
        }
    };

    // --- EVENT LISTENERS ---

    loginLogoutButton.addEventListener('click', () => {
        if (currentUser) { // Processo de Logout
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            updateUIForLogin();
            feedSection.classList.remove('hidden');
            createActivitySection.classList.add('hidden');
            btnAtividade.classList.remove('active');
            fetchAndRenderActivities(1, ''); // Volta a carregar todas as atividades
        } else { // Abrir modal de Login
            loginModal.classList.remove('hidden');
        }
    });
    
    closeModalButton.addEventListener('click', () => loginModal.classList.add('hidden'));
    cancelButton.addEventListener('click', () => loginModal.classList.add('hidden'));

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        try {
            const response = await fetch(`${apiUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            const data = await response.json();
            if (response.ok) {
                currentUser = data;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUIForLogin();
                loginModal.classList.add('hidden');
                loginForm.reset();
            } else {
                alert(data.erro || "Falha no login");
            }
        } catch (error) {
            console.error("Erro no login:", error);
            alert("Ocorreu um erro ao tentar fazer login.");
        }
    });

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.type;
            currentPage = 1;
            fetchAndRenderActivities(currentPage, currentFilter);
        });
    });
    
    btnAtividade.addEventListener('click', () => {
        if(currentUser) {
            const isFeedVisible = !feedSection.classList.contains('hidden');
            if (isFeedVisible) {
                feedSection.classList.add('hidden');
                createActivitySection.classList.remove('hidden');
                btnAtividade.classList.add('active');
            } else {
                feedSection.classList.remove('hidden');
                createActivitySection.classList.add('hidden');
                btnAtividade.classList.remove('active');
            }
        }
    });

    createActivityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!currentUser) {
            alert("Você precisa estar logado para criar uma atividade.");
            return;
        }

        const atividade = {
            tipo: document.getElementById('tipo').value,
            distancia: parseInt(document.getElementById('distancia').value),
            duracao: parseInt(document.getElementById('duracao').value),
            calorias: parseInt(document.getElementById('calorias').value),
            id_usuario: currentUser.id_usuario
        };

        try {
            const response = await fetch(`${apiUrl}/atividades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(atividade)
            });

            if(response.ok) {
                alert("Atividade criada com sucesso!");
                createActivityForm.reset();
                feedSection.classList.remove('hidden');
                createActivitySection.classList.add('hidden');
                btnAtividade.classList.remove('active');
                fetchAndRenderActivities(1, currentFilter);
            } else {
                const data = await response.json();
                alert(data.erro || "Falha ao criar atividade.");
            }
        } catch (error) {
            console.error("Erro ao criar atividade:", error);
            alert("Ocorreu um erro de comunicação ao criar a atividade.");
        }
    });

    // --- INICIALIZAÇÃO ---
    
    updateUIForLogin();
    // A variável 'currentFilter' está vazia ('') na inicialização, então esta chamada busca todas as atividades.
    fetchAndRenderActivities(currentPage, currentFilter);
});